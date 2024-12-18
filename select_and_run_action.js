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
const Trigger = require("@saltcorn/data/models/trigger");
const Field = require("@saltcorn/data/models/field");
const {
  jsexprToWhere,
  eval_expression,
} = require("@saltcorn/data/models/expression");
const { getState } = require("@saltcorn/data/db/state");

const db = require("@saltcorn/data/db");
const {
  stateFieldsToWhere,
  picked_fields_to_query,
} = require("@saltcorn/data/plugin-helper");
const { getActionConfigFields } = require("@saltcorn/data/plugin-helper");

const configuration_workflow = () =>
  new Workflow({
    steps: [
      {
        name: "Table selection",
        form: async (context) => {
          const table = Table.findOne(
            context.table_id || context.exttable_name
          );
          const stateActions = Object.entries(getState().actions).filter(
            ([k, v]) => !v.disableInList
          );
          
          const stateActionKeys = stateActions.map(([k, v]) => k);

          const triggerActions = Trigger.trigger_actions({
            tableTriggers: table.id,
            apiNeverTriggers: true,
          });
          const actions = Trigger.action_options({
            tableTriggers: table.id,
            apiNeverTriggers: true,
          });
          const actionConfigFields = [];

          for (const [name, action] of stateActions) {
            
            if (!stateActionKeys.includes(name)) continue;
            const cfgFields = await getActionConfigFields(action, table);
            
            for (const field of cfgFields) {
              const cfgFld = {
                ...field,
                showIf: {
                  action_name: name,                 
                  ...(field.showIf || {}),
                },
              };
              if (cfgFld.input_type === "code") cfgFld.input_type = "textarea";
              actionConfigFields.push(cfgFld);
            }
          }
          console.log(actionConfigFields);
          
          return new Form({
            fields: [
              {
                name: "label",
                label: "Label",
                sublabel:
                  "Use interpolations {{ }} to access fields on each row",
                type: "String",
              },
              {
                name: "action_name",
                label: "Action",
                type: "String",
                required: true,
                attributes: { options: actions },
              },
              ...actionConfigFields,
            ],
          });
        },
      },
    ],
  });
const get_state_fields = async (table_id, viewname, { columns }) => [];

const run = async (
  table_id,
  viewname,
  { relation, maxHeight, where, disabled, ajax, stay_open_on_select },
  state,
  extra
) => {
  const { id } = state;
  if (!id) return "need id";
  const req = extra.req;

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
  const table = await Table.findOne({ id: table_id });

  const relTable = await Table.findOne({ name: relTableNm });
  await relTable.getFields();
  const joinField = relTable.fields.find((f) => f.name === joinFieldNm);
  const joinedTable = await Table.findOne({ name: joinField.reftable_name });
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
  if (!rows[0]) return "No row selected";
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
  possibles.sort((a, b) => {
    const fa = a?.toLowerCase?.();
    const fb = b?.toLowerCase?.();
    return fa > fb ? 1 : fb > fa ? -1 : 0;
  });
  const selected = new Set(rows[0]._selected || []);
  return (
    select(
      { id: rndid, multiple: "multiple", class: "no-form-change" },
      possibles.map((p) => option({ selected: selected.has(p) }, p))
    ) +
    script(
      domReady(
        `$('#${rndid}').select2({ 
            width: '100%', 
            ${disabled ? "disabled: true," : ""}
            ${stay_open_on_select ? "closeOnSelect: false," : ""}
            dropdownParent: $('#${rndid}').parent(), 
            dropdownCssClass: "select2-dd-${rndid}",
            ${
              ajax
                ? ` minimumInputLength: 2,
            minimumResultsForSearch: 10,
            ajax: {
                url: "/api/${joinedTable.name}",
                dataType: "json",
                type: "GET",
                data: function (params) {
        
                    var queryParameters = {
                        ${valField}: params.term,
                        approximate: true
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

const go = async (
  table_id,
  viewname,
  { relation, field_values_formula },
  { id },
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

module.exports = {
  name: "Select row and run action",
  display_state_form: false,
  get_state_fields,
  configuration_workflow,
  run,
  routes: { go },
};
