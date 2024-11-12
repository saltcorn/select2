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
  configFields: [{ name: "multiple", label: "Multiple", type: "Bool" }],
  run: (nm, v, attrs = {}, cls, required, field, state = {}) => {
    const rndid = Math.floor(Math.random() * 16777215).toString(16);
    return (
      select(
        {
          id: `input${text_attr(nm)}`,
          class: `form-control ${cls} ${field.class || ""}`,
          //onChange: "select2_filter_change(this)",
          multiple: attrs.multiple ? "multiple" : undefined,
        },
        select_options(
          v,
          field,
          (attrs || {}).force_required,
          (attrs || {}).neutral_label
        )
      ) +
      script(
        domReady(`$('#input${text_attr(nm)}').select2({ 
            width: '100%',
      }).on('select2:select', function (e) {
       var data = e.params.data;
       console.log("data", data);

      });
`)
      )
    );
  },
};
