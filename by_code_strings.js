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
            async function () {},
          ).constructor;
          AsyncFunction(s);
          return true;
        } catch (e) {
          return e.message;
        }
      },
    },
    { name: "multiple", label: "Multiple", type: "Bool" },
    { name: "create_tags", label: "Create tags", type: "Bool" },
    {
      name: "token_separators",
      label: "Token separators",
      type: "String",
      showIf: { multiple: true },
      sublabel:
        "All the characters used as token separators. The first charactor will be used to join saved string",
    },
  ],
  async fill_options(
    field,
    force_allow_none,
    where0,
    extraCtx,
    optionsQuery,
    formFieldNames,
    user,
  ) {
    field.options = await eval_statements(field.attributes.code, {
      ...extraCtx,
      user,
      Table,
    });
  },
  read(v) {
    if (v === "null") return null;
    else return v;
  },
  run: (nm, v, attrs = {}, cls, required, field, state = {}) => {
    const splitReStr = attrs.token_separators
      ? `[${attrs.token_separators
          .split("")
          .map((c) => (c === " " ? "\\s" : c))}]+`
      : "[,]+";
    const selected = Array.isArray(v)
      ? v
      : typeof v === "undefined" || v === null
        ? []
        : v.split(new RegExp(splitReStr));
    const optionValues = new Set([]);
    const options = (field?.options || []).map((o) => {
      const val = or_if_undefined(o.value, o);
      optionValues.add(val);
      return option(
        {
          value: val,
          selected: selected.includes(or_if_undefined(o.value, o)),
        },
        or_if_undefined(o.label, o),
      );
    });
    selected.forEach((s) => {
      if (!optionValues.has(s)) {
        options.push(
          option(
            {
              value: s,
              selected: true,
            },
            s,
          ),
        );
      }
    });

    return (
      input({
        type: "hidden",
        id: `input${text_attr(nm)}`,
        "data-fieldname": field.form_name,
        name: text_attr(nm),
        onChange: attrs.onChange,
        value: v || "null",
        "data-postprocess": "it==='null' ? null: it",
      }) +
      select(
        {
          id: `input${text_attr(nm)}select`,
          class: `form-control ${cls} ${field?.class || ""}`,
          multiple: attrs.multiple ? "multiple" : undefined,
        },
        options,
      ) +
      script(
        domReady(`  
          function ensure_option(text) {          
          if (!$('#input${text_attr(
            nm,
          )}select').find("option[value='" + text + "']").length) {
              // Create a DOM Option and pre-select by default
              var newOption = new Option(text, text, true, true);
              // Append it to the select
              $('#input${text_attr(
                nm,
              )}select').append(newOption).trigger('change');
          } 
          
          }

      function update() {
       const selected = $('#input${text_attr(nm)}select').select2('data');
       const sel_ids = selected.map(s=>s.id);
        $('#input${text_attr(nm)}').val(sel_ids.join("${
          attrs.token_separators ? attrs.token_separators[0] : ","
        }")||"null").trigger("change");
      }  
      $('#input${text_attr(nm)}select').select2({ 
            width: '100%',   
            tokenSeparators: ${
              attrs.token_separators
                ? JSON.stringify(attrs.token_separators.split(""))
                : "[',']"
            },        
            ${attrs.create_tags ? `tags: true,` : ""}
            dropdownParent: $('#input${text_attr(
              nm,
            )}select').parent(),             
      }).on('select2:select', update).on('select2:unselect', update);
      $('#input${text_attr(nm)}').on("set_form_field", (e)=>{
            const vals = e.target.value.split(/${splitReStr}/)
            vals.forEach(ensure_option)
            $('#input${text_attr(nm)}select').val(vals).trigger('change');
      });
`),
      )
    );
  },
};
