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

module.exports = {
  type: "Key",
  isFilter: true,
  isEdit: false,
  configFields: [
    { name: "multiple", label: "Multiple", type: "Bool" },
    /*
    //Doesnt work
    {
      name: "stay_open_on_select",
      label: "Stay open",
      sublabel: "Do not close on select",
      type: "Bool",
    },*/
  ],
  run: (nm, v, attrs = {}, cls, required, field, state = {}) => {
    const selected = Array.isArray(v)
      ? v
      : typeof v === "undefined" || v === null
      ? []
      : [v];

    const options = (field.options || []).map((o) =>
      option({ value: o.value, selected: selected.includes(o.value) }, o.label)
    );

    return (
      select(
        {
          id: `input${text_attr(nm)}filter`,
          class: `form-control ${cls} ${field.class || ""}`,
          multiple: attrs.multiple ? "multiple" : undefined,
        },
        options
      ) +
      script(
        domReady(`
      function update() {
       const selected = $('#input${text_attr(
         nm
       )}filter').select2('data');       
       const sel_ids = selected.map(s=>s.id);
       set_state_field("${nm}", sel_ids, $("#input${text_attr(nm)}filter"))
      }      
      $('#input${text_attr(nm)}filter').select2({ 
            width: '100%',
            ${attrs.stay_open_on_select ? "closeOnSelect: false," : ""}
            dropdownParent: $('#input${text_attr(
              nm
            )}filter').parent(),             
      }).on('select2:select', update).on('select2:unselect', update);
`)
      )
    );
  },
};
