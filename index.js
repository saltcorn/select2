const {
  option,
  a,
  h5,
  span,
  text_attr,
  script,
  input,
  style,
  domReady,
} = require("@saltcorn/markup/tags");
const tags = require("@saltcorn/markup/tags");
const { select_options } = require("@saltcorn/markup/helpers");
const { features } = require("@saltcorn/data/db/state");
const bs5 = features && features.bootstrap5;

const select2 = {
  /** @type {string} */
  type: "Key",
  /** @type {boolean} */
  isEdit: true,
  blockDisplay: true,

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
      name: "maxHeight",
      label: "max-height px",
      type: "Integer",
    },
    {
      name: "force_required",
      label: "Force required",
      sublabel:
        "User must select a value, even if the table field is not required",
      type: "Bool",
    },
    {
      name: "label_formula",
      label: "Label formula",
      type: "String",
      class: "validate-expression",
      sublabel: "Uses summary field if blank",
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
    //console.log("select2 attrs", attrs);
    return (
      tags.select(
        {
          class: `form-control ${cls} ${field.class || ""}`,
          "data-fieldname": field.form_name,
          name: text_attr(nm),
          onChange: attrs.onChange,
          id: `input${text_attr(nm)}`,
          ...(attrs?.dynamic_where
            ? {
                "data-selected": v,
                "data-fetch-options": encodeURIComponent(
                  JSON.stringify(attrs?.dynamic_where)
                ),
              }
            : {}),
        },
        select_options(
          v,
          field,
          (attrs || {}).force_required,
          (attrs || {}).neutral_label
        )
      ) +
      script(
        domReady(
          `$('#input${text_attr(
            nm
          )}').select2({ width: '100%', dropdownParent: $('#input${text_attr(
            nm
          )}').parent(), dropdownCssClass: "select2-dd-${text_attr(nm)}"  });`
        )
      ) +
      (attrs?.maxHeight
        ? style(
            `.select2-container--default .select2-dd-${text_attr(
              nm
            )} .select2-results>.select2-results__options {max-height: ${
              attrs?.maxHeight
            }px;}`
          )
        : "")
    );
  },
};

const fieldviews = { select2 };

module.exports = {
  sc_plugin_api_version: 1,
  fieldviews,
  plugin_name: "select2",

  headers: [
    {
      script: "/plugins/public/select2/select2.min.js",
    },
    {
      css: "/plugins/public/select2/select2-1.min.css",
    },
    ...(bs5
      ? [
          {
            css: "/plugins/public/select2/select2-bootstrap-5-theme.min.css",
          },
        ]
      : []),
  ],
};
