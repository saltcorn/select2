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
      name: "placeholder",
      label: "Placeholder",
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
    const rndSuffix = Math.floor(Math.random() * 16777215).toString(16);

    const table = Table.findOne({ name: field.reftable_name });
    return (
      tags.select(
        {
          class: `form-control ${cls} ${field.class || ""}`,
          "data-fieldname": field.form_name,
          "data-on-cloned": "cloneCb(this)",
          name: text_attr(nm),
          onChange: attrs.onChange,
          id: `input${text_attr(nm)}${rndSuffix}`,
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
        domReady(`
    const isWeb = typeof window.parent.saltcorn?.mobileApp === "undefined";
    let url = "/api/${field.reftable_name}";
    if (!isWeb) {
      const { server_path } = parent.saltcorn.data.state.getState().mobileConfig;
      url = server_path + "/api/${field.reftable_name}";
    }

    window.cloneCb = function(select) {
      // remove select2 stuff and reinitialize
      const jSelect = $(select)
      const span = jSelect.next();
      if (span.is("span")) span.remove();
      const script = jSelect.next();
      if (script.is("script")) script.remove();
      jSelect.removeClass("select2-hidden-accessible");
      jSelect.removeAttr("data-select2-id aria-hidden tabindex");
      jSelect.find("option").removeAttr("data-select2-id");
      initSelect2Inp(jSelect.attr("name"));
    }

    window.initSelect2Inp = function(fName) {
      $('#input' + fName + '${rndSuffix}').select2({
        width: '100%',
        ${attrs.placeholder ? `placeholder: "${attrs.placeholder}",` : ""}
        ${
          attrs.ajax
            ? ` minimumInputLength: 2,
        minimumResultsForSearch: 10,
        ajax: {
            url: url,
            dataType: "json",
            type: "GET",
            data: function (params) {
    
                var queryParameters = {
                    ${field.attributes.summary_field}: params.term,
                    approximate: true
                }
                if (!isWeb) {
                  const { jwt } = parent.saltcorn.data.state.getState().mobileConfig;
                  queryParameters.jwt = jwt;
                }
                return queryParameters;
            },
            processResults: function (data) {
                if(!data || !data.success) return [];
                return {
                    results: $.map(data.success, function (item) {
                        return {
                            text: item.${field.attributes.summary_field},
                            id: item["${table ? table.pk_name : "id"}"],
                        }
                    })
                };
              }},`
            : ""
        }
        dropdownParent: $('#input' + fName + '${rndSuffix}').parent(),
        dropdownCssClass: "select2-dd-" + fName,
      });
      $('#input' + fName + '${rndSuffix}').on('change', (e) => {
        if (window.handle_identical_fields)
          handle_identical_fields(e);
      });
    }
    initSelect2Inp("${text_attr(nm)}");`)
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
  ready_for_mobile: true,
};
