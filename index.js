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
const Table = require("@saltcorn/data/models/table");
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
      name: "ajax",
      label: "Ajax fetch options",
      type: "Bool",
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
    //console.log("select2 attrs", attrs, field);

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
        attrs.ajax
          ? select_options(
              v,
              { ...field, options: field.options.filter((o) => o.value == v) },
              (attrs || {}).force_required,
              (attrs || {}).neutral_label
            )
          : select_options(
              v,
              field,
              (attrs || {}).force_required,
              (attrs || {}).neutral_label
            )
      ) +
      script(
        domReady(
          `$('#input${text_attr(nm)}').select2({ 
            width: '100%', 
            ${
              attrs.ajax
                ? ` minimumInputLength: 2,
            minimumResultsForSearch: 10,
            ajax: {
                url: "/api/${field.reftable_name}",
                dataType: "json",
                type: "GET",
                data: function (params) {
        
                    var queryParameters = {
                        ${field.attributes.summary_field}: params.term,
                        approximate: true
                    }
                    return queryParameters;
                },
                processResults: function (data) {
                    if(!data || !data.success) return [];
                    return {
                        results: $.map(data.success, function (item) {
                            return {
                                text: item.${field.attributes.summary_field},
                                id: item.id
                            }
                        })
                    };
                  }},`
                : ""
            }
            dropdownParent: $('#input${text_attr(
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

const fieldviews = { select2, select2_filter: require("./filter") };

const base_headers = `/plugins/public/select2@${
  require("./package.json").version
}`;

module.exports = {
  sc_plugin_api_version: 1,
  fieldviews,
  plugin_name: "select2",
  viewtemplates: [require("./edit-nton"), require("./select_and_run_action")],
  headers: [
    {
      script: `${base_headers}/select2.min.js`,
    },
    {
      css: `${base_headers}/select2.min.css`,
    },
  ],
};
