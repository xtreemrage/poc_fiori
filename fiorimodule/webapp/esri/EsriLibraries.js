sap.ui.define([
    "nl/gasunie/poc/fiorimodule/esri/EsriControl",
    "nl/gasunie/poc/fiorimodule/esri/EsriApi",
    "sap/m/MessageBox",
    "sap/base/Log",
    "sap/ui/model/resource/ResourceModel",
    "sap/base/i18n/ResourceBundle"
], (oEsriControl, oEsriApi, oMessageBox, oLog, oResourceModel, oResourceBundle) => {
    "use strict";

    const loadLibraries = (sUrl) => {
        $("head").append(`<script src='${sUrl}'/>`);
    };

    const loadStylesheets = (oUrls) => {
        if (oUrls) {
            oUrls.forEach((sUrl) => {
                $("head").append(`<link rel='stylesheet' type='text/css' href='${sUrl}'/>`);
            });
        }

        const sEsriStyle = sap.ui.require.toUrl("nl/gasunie/poc/fiorimodule/esri/css/EsriStyle.css");

        $("head").append(`<link rel='stylesheet' href='${sEsriStyle}' type='text/css'/>`);
    };

    return {
        initialize : (oComponent) => {

            const sVersion = "4.20";

            oLog.info(`ESRI API JavaScript version ${sVersion} loaded...`);
            
            const sEsriLib = sap.ui.require.toUrl("nl/gasunie/poc/fiorimodule/esri/init.js");
            loadLibraries(sEsriLib);

            loadStylesheets([
                `https://js.arcgis.com/${sVersion}/esri/themes/light/main.css`
            ]);
        }
    };
});