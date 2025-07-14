const {
  option,
  a,
  h5,
  span,
  text_attr,
  script,
  input,
  style,
  select,
  domReady,
} = require("@saltcorn/markup/tags");
const { select_options } = require("@saltcorn/markup/helpers");
const { eval_statements } = require("@saltcorn/data/models/expression");
const Table = require("@saltcorn/data/models/table");

module.exports = {
  type: "String",
  isEdit: true,
  configFields: (field) => [
    { name: "multiple", label: "Multiple", type: "Bool" },
    {
      name: "code",
      label: "Code",
      input_type: "code",
      attributes: { mode: "application/javascript" },
      class: "validate-statements",
      sublabel: `Return array of: strings or <code>{ label: string, value: ${
        field.is_fkey ? "key-value" : field.type?.js_type || "any"
      } }</code>`,
      validator(s) {
        try {
          let AsyncFunction = Object.getPrototypeOf(
            async function () {}
          ).constructor;
          AsyncFunction(s);
          return true;
        } catch (e) {
          return e.message;
        }
      },
    },
  ],
  async fill_options(
    field,
    force_allow_none,
    where0,
    extraCtx,
    optionsQuery,
    formFieldNames,
    user
  ) {
    console.log("inner field", field.name);
    
    field.options = await eval_statements(field.attributes.code, {
      ...extraCtx,
      user,
      Table,
    });
    console.log(field.options);
    
  },
  run: (nm, v, attrs = {}, cls, required, field, state = {}) => {
    const selected = Array.isArray(v)
      ? v
      : typeof v === "undefined" || v === null
      ? []
      : [v];
    console.log("fopts", field);
    
    const options = (field?.options || []).map((o) =>
      option({ value: o.value, selected: selected.includes(o.value) }, o.label)
    );

    return (
      select(
        {
          id: `input${text_attr(nm)}`,
          class: `form-control ${cls} ${field?.class || ""}`,
          multiple: attrs.multiple ? "multiple" : undefined,
        },
        options
      ) +
      script(
        domReady(`     
      $('#input${text_attr(nm)}').select2({ 
            width: '100%',           
            dropdownParent: $('#input${text_attr(
              nm
            )}').parent(),             
      });
`)
      )
    );
  },
};
