const {
  span,
  button,
  i,
  a,
  script,
  domReady,
  di,
  select,
  option,
  style,
} = require("@saltcorn/markup/tags");
const View = require("@saltcorn/data/models/view");
const Workflow = require("@saltcorn/data/models/workflow");
const Table = require("@saltcorn/data/models/table");
const Form = require("@saltcorn/data/models/form");
const Field = require("@saltcorn/data/models/field");
const {
  jsexprToWhere,
  eval_expression,
} = require("@saltcorn/data/models/expression");

const db = require("@saltcorn/data/db");
const {
  stateFieldsToWhere,
  picked_fields_to_query,
} = require("@saltcorn/data/plugin-helper");
const { features } = require("@saltcorn/data/db/state");
const bs5 = features && features.bootstrap5;

const configuration_workflow = () =>
  new Workflow({
    steps: [
      {
        name: "Many-to-many relation",
        form: async (context) => {
          const table = await Table.findOne({ id: context.table_id });
          const mytable = table;
          const fields = await table.getFields();
          const { child_field_list, child_relations } =
            await table.get_child_relations();
          var agg_field_opts = [];

          for (const { table, key_field } of child_relations) {
            const keyFields = table.fields.filter(
              (f) =>
                f.type === "Key" && !["_sc_files"].includes(f.reftable_name)
            );
            for (const kf of keyFields) {
              const joined_table = await Table.findOne({
                name: kf.reftable_name,
              });
              if (!joined_table) continue;
              await joined_table.getFields();
              joined_table.fields.forEach((jf) => {
                agg_field_opts.push({
                  label: `${table.name}.${key_field.name}&#8594;${kf.name}&#8594;${jf.name}`,
                  name: `${table.name}.${key_field.name}.${kf.name}.${jf.name}`,
                });
              });
            }
          }
          return new Form({
            blurb: "Choose the relation that will be edited",
            fields: [
              {
                name: "relation",
                label: "Relation",
                type: "String",
                sublabel:
                  "Only many-to-many relations (JoinTable.foreignKey&#8594;keyToTableWithLabels&#8594;LabelField) are supported ",

                required: true,
                attributes: {
                  options: agg_field_opts,
                },
              },
              {
                name: "maxHeight",
                label: "max-height px",
                type: "Integer",
              },
              {
                name: "where",
                label: "Where",
                type: "String",
                class: "validate-expression",
              },
              {
                name: "placeholder",
                label: "Placeholder",
                type: "String",
              },
              {
                name: "ajax",
                label: "Ajax fetch options",
                type: "Bool",
              },
              {
                name: "field_values_formula",
                label: "Row values formula",
                class: "validate-expression",
                sublabel:
                  "Optional. A formula for field values set when creating a new join table row. For example <code>{name: manager}</code>",
                type: "String",
                fieldview: "textarea",
              },
              {
                name: "disabled",
                label: "Disabled",
                type: "Bool",
              },
              {
                name: "stay_open_on_select",
                label: "Stay open",
                sublabel: "Do not close on select",
                type: "Bool",
              },
            ],
          });
        },
      },
    ],
  });
const get_state_fields = async (table_id, viewname, { columns }) => [
  {
    name: "id",
    type: "Integer",
    required: true,
  },
];

const run = async (
  table_id,
  viewname,
  {
    relation,
    maxHeight,
    where,
    disabled,
    ajax,
    stay_open_on_select,
    placeholder,
  },
  state,
  extra,
  { get_rows_query }
) => {
  const { id } = state;
  if (!id) return "need id";

  if (!relation) {
    throw new Error(
      `Select2 many-to-many view ${viewname} incorrectly configured. No relation chosen`
    );
  }
  const relSplit = relation.split(".");
  if (relSplit.length < 4) {
    throw new Error(
      `Select2 many-to-many view ${viewname} incorrectly configured. No relation chosen`
    );
  }
  const rndid = `bs${Math.round(Math.random() * 100000)}`;
  const [relTableNm, relField, joinFieldNm, valField] = relSplit;

  const relTable = await Table.findOne({ name: relTableNm });
  await relTable.getFields();
  const joinField = relTable.fields.find((f) => f.name === joinFieldNm);
  const joinedTable = await Table.findOne({ name: joinField.reftable_name });
  const { rows, possibles } = await get_rows_query(id);
  if (!rows[0]) return "No row selected";
  possibles.sort((a, b) => {
    const fa = a?.toLowerCase?.();
    const fb = b?.toLowerCase?.();
    return fa > fb ? 1 : fb > fa ? -1 : 0;
  });
  const selected = new Set(rows[0]._selected || []);
  return (
    select(
      { id: rndid, multiple: "multiple", class: "no-form-change" },
      possibles.map((p) => option({ selected: selected.has(p), value: p }, p))
    ) +
    script(
      domReady(
        `const isWeb = typeof window.parent.saltcorn?.mobileApp === "undefined";
         let url = "/api/${joinedTable.name}";
         if (!isWeb) {
           const { server_path } = parent.saltcorn.data.state.getState().mobileConfig;
           url = server_path + "/api/${joinedTable.name}";
         }
          $('#${rndid}').select2({ 
            width: '100%', 
            ${disabled ? "disabled: true," : ""}
            ${stay_open_on_select ? "closeOnSelect: false," : ""}
            dropdownParent: $('#${rndid}').parent(), 
            dropdownCssClass: "select2-dd-${rndid}",
            ${placeholder ? `placeholder: "${placeholder}",` : ""}
            ${
              ajax
                ? ` minimumInputLength: 2,
            minimumResultsForSearch: 10,
            ajax: {
                url: url,
                dataType: "json",
                type: "GET",
                data: function (params) {

                    var queryParameters = {
                        ${valField}: params.term,
                        approximate: true
                    }
                    if (!isWeb) {
                      const { jwt } = parent.saltcorn.data.state.getState().mobileConfig;
                      queryParameters.jwt = jwt;
                    }
                    return queryParameters;
                },
                processResults: function (data) {
                    if(!data || !data.success) return [];
                    return {
                        results: $.map(data.success, function (item) {
                            return {
                                text: item.${valField},
                                id: item.${valField}
                            }
                        })
                    };
                  }},`
                : ""
            }
        });
        $('#${rndid}').on('select2:unselect', function (e) {
            view_post('${viewname}', 'remove', {id:'${id}', value: e.params.data.id});
        });
        $('#${rndid}').on('select2:select', function (e) {
            view_post('${viewname}', 'add', {id:'${id}', value: e.params.data.id});
        });`
      )
    ) +
    (maxHeight
      ? style(
          `.select2-container--default .select2-dd-${rndid} .select2-results>.select2-results__options {max-height: ${maxHeight}px;}`
        )
      : "")
  );
};

const remove = async (table_id, viewname, { relation }, { id, value }) => {
  const relSplit = relation.split(".");
  const [joinTableNm, relField, joinFieldNm, valField] = relSplit;
  const joinTable = await Table.findOne({ name: joinTableNm });
  await joinTable.getFields();
  const joinField = joinTable.fields.find((f) => f.name === joinFieldNm);
  const schema = db.getTenantSchema();
  await db.query(
    `delete from "${schema}"."${db.sqlsanitize(joinTable.name)}" 
      where "${db.sqlsanitize(relField)}"=$1 and 
      "${db.sqlsanitize(joinFieldNm)}" in 
      (select id from 
        "${schema}"."${db.sqlsanitize(joinField.reftable_name)}" 
        where "${db.sqlsanitize(valField)}"=$2)`,
    [id, value]
  );
  return { json: { success: "ok" } };
};
const add = async (
  table_id,
  viewname,
  { relation, field_values_formula },
  { id, value },
  { req }
) => {
  const table = await Table.findOne({ id: table_id });
  const rows = await table.getJoinedRows({
    where: { id },
    forPublic: !req.user || req.user.role_id === 100, // TODO in mobile set user null for public
    forUser: req.user,
  });
  if (!rows[0]) return { json: { error: "Row not found" } };
  let extra = {};
  if (field_values_formula) {
    extra = eval_expression(field_values_formula, rows[0], req.user);
  }
  const relSplit = relation.split(".");
  const [joinTableNm, relField, joinFieldNm, valField] = relSplit;
  const joinTable = await Table.findOne({ name: joinTableNm });
  await joinTable.getFields();
  const joinField = joinTable.fields.find((f) => f.name === joinFieldNm);
  const joinedTable = await Table.findOne({ name: joinField.reftable_name });
  const joinedRow = await joinedTable.getRow({ [valField]: value });
  const result = {};
  await joinTable.insertRow(
    {
      [relField]: id,
      [joinFieldNm]: joinedRow.id,
      ...extra,
    },
    req.user || { role_id: 100 },
    result
  );
  return { json: { success: "ok", ...result } };
};

const queries = ({
  table_id,
  configuration: {
    relation,
    maxHeight,
    where,
    disabled,
    ajax,
    stay_open_on_select,
  },
  req,
}) => ({
  async get_rows_query(id) {
    const [relTableNm, relField, joinFieldNm, valField] = relation.split(".");
    const relTable = Table.findOne({ name: relTableNm });
    await relTable.getFields();
    const joinField = relTable.fields.find((f) => f.name === joinFieldNm);
    const table = Table.findOne({ id: table_id });
    const joinedTable = Table.findOne({ name: joinField.reftable_name });
    const rows = await table.getJoinedRows({
      where: { id },
      forPublic: !req.user || req.user.role_id === 100, // TODO in mobile set user null for public
      forUser: req.user,
      aggregations: {
        _selected: {
          table: joinField.reftable_name,
          ref: "id",
          subselect: {
            field: joinFieldNm,
            table: { name: db.sqlsanitize(relTable.name) }, //legacy, workaround insufficient escape
            whereField: relField,
          },
          field: valField,
          aggregate: "ARRAY_AGG",
        },
      },
    });
    if (!rows[0]) return { rows: [], possibles: [] };
    let possibles = [];
    if (!ajax) {
      possibles = await joinedTable.distinctValues(
        valField,
        where
          ? jsexprToWhere(
              where,
              { ...rows[0], user: req.user },
              joinedTable.getFields()
            )
          : undefined
      );
    } else {
      possibles = rows[0]._selected || [];
    }
    return { rows, possibles };
  },
});

module.exports = {
  name: "Select2 many-to-many",
  display_state_form: false,
  get_state_fields,
  configuration_workflow,
  run,
  queries,
  routes: { remove, add },
};
