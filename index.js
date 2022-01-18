const {
  option,
  a,
  h5,
  span,
  text_attr,
  script,
  input,
} = require("@saltcorn/markup/tags");
const tags = require("@saltcorn/markup/tags");
const { select_options } = require("@saltcorn/markup/helpers");

const select2 = {
  /** @type {string} */
  type: "Key",
  /** @type {boolean} */
  isEdit: true,
  /**
   * @type {object[]}
   */
  configFields: () => [
    {
      name: "neutral_label",
      label: "Neutral label",
      type: "String",
    },
    {
      name: "where",
      label: "Where",
      type: "String",
    },
    {
      name: "force_required",
      label: "Force required",
      sublabel:
        "User must select a value, even if the table field is not required",
      type: "Bool",
    },
  ],

  /**
   * @param {*} nm
   * @param {*} v
   * @param {*} attrs
   * @param {*} cls
   * @param {*} reqd
   * @param {*} field
   * @returns {object}
   */
  run: (nm, v, attrs, cls, reqd, field) => {
    if (attrs.disabled)
      return (
        input({
          class: `${cls} ${field.class || ""}`,
          "data-fieldname": field.form_name,
          name: text_attr(nm),
          id: `input${text_attr(nm)}`,
          readonly: true,
          placeholder: v || field.label,
        }) + span({ class: "ml-m1" }, "v")
      );
    return tags.select(
      {
        class: `form-control ${cls} ${field.class || ""}`,
        "data-fieldname": field.form_name,
        name: text_attr(nm),
        id: `input${text_attr(nm)}`,
      },
      select_options(
        v,
        field,
        (attrs || {}).force_required,
        (attrs || {}).neutral_label
      )
    );
  },
};

module.exports = {
  sc_plugin_api_version: 1,
  fieldviews: { select2 },
  plugin_name: "select2",

  headers: [
    {
      script: "/plugins/public/select2/select2.min.js",
    },
    {
      css: "/plugins/public/select2/select2.min.css",
    },
  ],
};
