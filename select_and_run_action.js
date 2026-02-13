const {
  span,
  button,
  i,
  a,
  script,
  domReady,
  di,
  div,
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
const { interpolate } = require("@saltcorn/data/utils");

const db = require("@saltcorn/data/db");
const {
  stateFieldsToWhere,
  picked_fields_to_query,
} = require("@saltcorn/data/plugin-helper");
const {
  getActionConfigFields,
  run_action_column,
} = require("@saltcorn/data/plugin-helper");

const configuration_workflow = () =>
  new Workflow({
    steps: [
      {
        name: "Table selection",
        form: async (context) => {
          const table = Table.findOne(
            context.table_id || context.exttable_name,
          );
          const stateActions = Object.entries(getState().actions).filter(
            ([k, v]) => !v.disableInList,
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
  { label, action_name },
  state,
  extra,
  { get_rows_query },
) => {
  const req = extra.req;

  const rndid = `bs${Math.round(Math.random() * 100000)}`;

  const table = await Table.findOne({ id: table_id });

  const rows = await get_rows_query();
  if (!rows[0]) return "No row selected";

  return (
    div(
      { class: "d-flex" },
      select(
        { id: rndid },
        rows.map((row) =>
          option(
            { value: row[table.pk_name] },
            interpolate(label, row, req.user),
          ),
        ),
      ),
      button(
        {
          type: "button",
          class: "btn btn-secondary",
          onclick: `select_and_run_${rndid}()`,
        },
        "OK",
      ),
    ) +
    script(
      `function select_and_run_${rndid}() {
            const id = $('#${rndid}').val();
            view_post('${viewname}', 'go', {id, state: ${JSON.stringify(
              state,
            )}})
        }` +
        domReady(
          `$('#${rndid}').select2({ 
            width: '100%', 
            dropdownParent: $('#${rndid}').parent(), 
            dropdownCssClass: "select2-dd-${rndid}",

        });`,
        ),
    )
  );
};

const go = async (table_id, viewname, cfg, { id, state }, { req }) => {
  const table = await Table.findOne({ id: table_id });
  const row = await table.getRow({ [table.pk_name]: id });
  if (!row) return { json: { error: "Row not found" } };
  const col = { ...cfg, configuration: cfg };
  const result = await run_action_column({
    col,
    req,
    table,
    row: { ...row, state },
  });
  return { json: { success: "ok", ...(result || {}) } };
};

const queries = ({ table_id, req }) => ({
  async get_rows_query() {
    const table = Table.findOne({ id: table_id });
    const rows = await table.getJoinedRows({
      where: {},
      forPublic: !req.user || req.user.role_id === 100,
      forUser: req.user,
    });
    return rows;
  },
});

module.exports = {
  name: "Select row and run action",
  display_state_form: false,
  get_state_fields,
  configuration_workflow,
  run,
  queries,
  routes: { go },
};
