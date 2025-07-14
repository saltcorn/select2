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

const or_if_undefined = (x, def) => (typeof x === "undefined" ? def : x);

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
    field.options = await eval_statements(field.attributes.code, {
      ...extraCtx,
      user,
      Table,
    });
  },
  run: (nm, v, attrs = {}, cls, required, field, state = {}) => {
    const selected = Array.isArray(v)
      ? v
      : typeof v === "undefined" || v === null
      ? []
      : v.split(/[\s,]+/);

    const options = (field?.options || []).map((o) =>
      option(
        {
          value: or_if_undefined(o.value, o),
          selected: selected.includes(or_if_undefined(o.value, o)),
        },
        or_if_undefined(o.label, o)
      )
    );

    return (
      input({
        type: "hidden",
        id: `input${text_attr(nm)}`,
        "data-fieldname": field.form_name,
        name: text_attr(nm),
        onChange: attrs.onChange,
        value: v,
      }) +
      select(
        {
          id: `input${text_attr(nm)}select`,
          class: `form-control ${cls} ${field?.class || ""}`,
          multiple: attrs.multiple ? "multiple" : undefined,
        },
        options
      ) +
      script(
        domReady(`   
      function update() {
       const selected = $('#input${text_attr(nm)}select').select2('data');
       const sel_ids = selected.map(s=>s.id);
            console.log("sel2 selected",selected)
        $('#input${text_attr(nm)}').val(sel_ids.join(","))
      }  
      $('#input${text_attr(nm)}select').select2({ 
            width: '100%',   
            tokenSeparators: [',', ' '],        
            dropdownParent: $('#input${text_attr(
              nm
            )}select').parent(),             
      }).on('select2:select', update).on('select2:unselect', update);
`)
      )
    );
  },
};
