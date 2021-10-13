sap.ui.define([
    "sap/ui/core/Control",
    "nl/gasunie/poc/fiorimodule/esri/EsriApi",
    "sap/ui/core/HTML",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter"
], (oControl, oEsriApi, oHTML, oMessageBox, oMessageToast, oDialog, oButton, oFilter, oFilterOperator, oSorter) => {
    "use strict";

    return oControl.extend("nl.gasunie.poc.fiorimodule.esri.EsriControl", {

        metadata: {
            properties: {
                applicationID: { type: "string" },
                height: { type: "string", defaultValue: "100%" },

                showHomeBtn: { type: "boolean", defaultValue: false },
                showLocationBtn: { type: "boolean", defaultValue: false },
                showLayerBtn: { type: "boolean", defaultValue: false },
                showBaseLayerBtn: { type: "boolean", defaultValue: false },
                showDrawBtn: { type: "boolean", defaultValue: false }, // not supported for phone
                showMeasureBtn: { type: "boolean", defaultValue: false },
                showInfoBtn: { type: "boolean", defaultValue: false },
                showXyBtn: { type: "boolean", defaultValue: false },

                enableDrawPoint: { type: "boolean", defaultValue: true },
                enableDrawPolygon: { type: "boolean", defaultValue: true },
                enableDrawDelete: { type: "boolean", defaultValue: true },

                enableDataForLayers: { type: "object", defaultValue: [] }, // layerIDs
                enableClickForLayers: { type: "object", defaultValue: [] }, // layerIDs
                enableDblClickForLayers: { type: "object", defaultValue: [] }, // layerIDs
                enableHoverForLayers: { type: "object", defaultValue: [] } // layerIDs
            },
            aggregations: {
                esriHtml: { type: "sap.ui.core.HTML", multiple: false }
            },
            events: {
                afterLoading: { parameters: { instance: { type: "object" }, control: { type: "object" } } },
                errorLoading: { parameters: { instance: { type: "object" }, control: { type: "object" } } },
                unexpectedFailure: { parameters: { instance: { type: "object" }, control: { type: "object" } } },

                layerData: { parameters: { data: { type: "object" } } },
                layerHover: { parameters: { event: { type: "object" } } },
                layerClick: { parameters: { event: { type: "object" } } },
                layerDblClick: { parameters: { event: { type: "object" } } },

                geometryCreated: { parameters: { event: { type: "object" } } },
                geometryUpdated: { parameters: { event: { type: "object" } } },
                geometryDeleted: { parameters: { event: { type: "object" } } }
            }
        },

        init: function() {
            this.setAggregation("esriHtml", new oHTML());
        },

        renderer: function(oRM, oControl) {
            const oHtml = oControl.getAggregation("esriHtml");
            const sHeight = oControl.getHeight();

            oRM.write(`<div style='height:${sHeight}'`);
            oRM.writeControlData(oControl);
            oRM.write("style='height:100%'");
            oRM.writeClasses();
            oRM.write(">");
            oRM.renderControl(oHtml);
            oRM.write("</div>");

                    console.error("renderer esri control")
            if (!oControl.bEsriInstanceLoading) {
                    console.error("bEsriInstanceLoading")
                oControl.bEsriInstanceLoading = true;
                oControl.initializeEsriInstance(oHtml);
            }
        },

        initializeEsriInstance: async function(oHtml) {
            try {
                console.error("initializeEsriInstance")
                const sAppId = this.getApplicationID();
                const oConfig = await this.getConfiguration(sAppId);
                console.error("getConfiguration")
                const oInstance = await this.createEsriInstance(oHtml, sAppId, oConfig);

                this.setInstance(oInstance);
                this.setButtons(oInstance);
                this.setEventHandlers(oInstance);
                this.fireEvent("afterLoading", { instance: oInstance, control: this });
                this.bEsriInstanceLoaded = true;

            } catch (oError) {
                this.fireEvent("errorLoading", { error: oError, control: this });
            }
        },

        createEsriInstance: function(oHtml, sAppId, oConfig) {
            const oDeferred = $.Deferred();

            new oEsriApi({
                html: oHtml,
                appId: sAppId,
                config: oConfig,
                success: oDeferred.resolve,
                error: oDeferred.reject,
                unexpectedFailure: this.handleUnexpectedFailure.bind(this)
            });

            return oDeferred.promise();
        },

        checkEsriInstanceLoaded: function() {
            const oDeferred = $.Deferred();

            const nMax = 10, nWait = 500;
            let oInterval = null, iCount = 0;

            if (this.bEsriInstanceLoaded) {
                oDeferred.resolve("LOADED");

            } else {
                oInterval = setInterval(() => {
                    if (this.bEsriInstanceLoaded) {
                        clearInterval(oInterval);
                        oDeferred.resolve("LOADED");
                    } else if (iCount > nMax) {
                        clearInterval(oInterval);
                        oDeferred.resolve("NOTLOADED");
                    }

                    iCount++;
                }, nWait);
            }

            return oDeferred.promise();
        },

        handleUnexpectedFailure: function(oError) {
            oMessageBox.error(this.getText("ERROR.UNEXPECTED_FAILURE"));
            this.fireEvent("unexpectedFailure", { error: oError, control: this });
        },

        openInDialog: function(oParentView, oDialogSettings) {
            if (!this.oEsriDialog) {
                oParentView.addDependent(this);
                const oDs = oDialogSettings || {};

                this.oEsriDialog = new oDialog({
                    title: oDs.title ? oDs.title : this.getText("HEADER_DIALOG"),
                    stretch: !sap.ui.Device.system.desktop,
                    draggable: typeof (oDs.draggable) === "boolean" ? oDs.draggable : true,
                    resizable: typeof (oDs.resizable) === "boolean" ? oDs.resizable : true,
                    contentHeight: oDs.contentHeight || "70%",
                    contentWidth: oDs.contentWidth || "80%",
                    content: this,
                    beginButton: new oButton({
                        text: this.getText("BTN.CLOSE"),
                        press: () => this.oEsriDialog.close()
                    })
                })
                    .addStyleClass("sapUiNoContentPadding")
                    .addStyleClass("guEsriDialogFullHeight");

                oParentView.addDependent(this.oEsriDialog);
            }

            this.oEsriDialog.open();

            return this.oEsriDialog;
        },

        getText: function(sId, mParam) {
            return this.getRb().getText(sId, mParam);
        },
        getRb: function() {
            return this.getModel("i18n-esri").getResourceBundle();
        },
        setInstance: function(oInstance) {
            this.oEsriInstance = oInstance;
        },
        getInstance: function() {
            return this.oEsriInstance;
        },

        getConfiguration: async function(sAppId) {
            let oConfigApp = {}, oConfigBaseLayers = [], oConfigLayers = [];

            try {
                oConfigApp = await this.getConfigApplication(sAppId);
                oConfigBaseLayers = await this.getConfigApplicationBaseLayers(oConfigApp.ID);
                oConfigLayers = await this.getConfigApplicationLayers(oConfigApp.ID);
            } catch (oError) {
                // TODO REMOVE TRY CATCH
            }

            return {
                application: oConfigApp,
                baselayers: oConfigBaseLayers,
                layers: oConfigLayers
            };
        },

        getConfigApplication: function(sAppId) {
            const oDeferred = $.Deferred();

            const sConfig = '{"applicationID":"1bc6ba52-6a6a-430c-bc50-e647f0fc5d6a","ID":"a6cb2f7c-c148-4322-955f-8861045f23a3"}';  

            oDeferred.resolve(JSON.parse(sConfig));
            
            return oDeferred.promise();
        },

        getConfigApplicationBaseLayers: function(sId) {
            const oDeferred = $.Deferred();

            const sConfig = '[{"ID":"6de46fcc-87be-4152-890f-be3be3a54d48","createdAt":null,"createdBy":null,"modifiedAt":null,"modifiedBy":null,"applicationID":"1bc6ba52-6a6a-430c-bc50-e647f0fc5d6a","baseLayerID":"TOPORD","layerType":"MAPIMAGE","description":"Topo","layerRelease":"2020","url":"https://services.arcgisonline.nl/arcgis/rest/services/Basiskaarten/Topo/MapServer","urlThumbnail":"https://www.arcgis.com/sharing/rest/content/items/1d1d425122e74d4d87695e163f3f10ce/info/thumbnail/thumbnail.png","gasunieLayer":false,"defaultLayer":true,"position":10,"status":"ACTV"},{"ID":"2bd33f59-f838-49f7-b8af-c8f7c75372f1","createdAt":null,"createdBy":null,"modifiedAt":null,"modifiedBy":null,"applicationID":"1bc6ba52-6a6a-430c-bc50-e647f0fc5d6a","baseLayerID":"LUCHTRD","layerType":"MAPIMAGE","description":"Luchtfoto","layerRelease":"2020","url":"https://services.arcgisonline.nl/arcgis/rest/services/Luchtfoto/Luchtfoto/MapServer","urlThumbnail":"https://www.arcgis.com/sharing/rest/content/items/5c621f71daf34eef8d2973caa94a7b3b/info/thumbnail/thumbnail.png","gasunieLayer":false,"defaultLayer":false,"position":20,"status":"ACTV"},{"ID":"612afcdd-d56b-45fd-ad75-988cd08e0e51","createdAt":null,"createdBy":null,"modifiedAt":null,"modifiedBy":null,"applicationID":"1bc6ba52-6a6a-430c-bc50-e647f0fc5d6a","baseLayerID":"DARKGREYRD","layerType":"MAPIMAGE","description":"Donkergrijs","layerRelease":"2020","url":"https://services.arcgisonline.nl/arcgis/rest/services/Basiskaarten/Donkergrijze_Canvas/MapServer","urlThumbnail":"https://www.arcgis.com/sharing/rest/content/items/3c73e79bc6c44544add49d4698190676/info/thumbnail/thumbnail.png","gasunieLayer":false,"defaultLayer":false,"position":30,"status":"ACTV"},{"ID":"9cfa45c2-85eb-4a2a-a7e9-7e5230cdffed","createdAt":null,"createdBy":null,"modifiedAt":null,"modifiedBy":null,"applicationID":"1bc6ba52-6a6a-430c-bc50-e647f0fc5d6a","baseLayerID":"LIGHTGREYRD","layerType":"MAPIMAGE","description":"Lichtgrijs","layerRelease":"2020","url":"https://services.arcgisonline.nl/arcgis/rest/services/Basiskaarten/Canvas/MapServer","urlThumbnail":"https://www.arcgis.com/sharing/rest/content/items/338eba51592f4a76ba196b362fb5e95b/info/thumbnail/thumbnail.png","gasunieLayer":false,"defaultLayer":false,"position":40,"status":"ACTV"}]';
            
            oDeferred.resolve(JSON.parse(sConfig));
            
            return oDeferred.promise();
        },

        getConfigApplicationLayers: function(sId) {
            const oDeferred = $.Deferred();

            const sConfig = '[{"ID":"ff85e067-8807-44cd-9d93-fbd30667469e","createdAt":null,"createdBy":null,"modifiedAt":null,"modifiedBy":null,"applicationID":"1bc6ba52-6a6a-430c-bc50-e647f0fc5d6a","layerID":"PIPELINE","layerType":"FEATURE","description":"Leiding","layerRelease":"2021","opacity":"1","gasunieLayer":true,"showInWidget":true,"position":30,"visible":true,"url":"a-gpl-server.gasunie.nl/arcgis/rest/services/Leiding/FeatureServer/0","status":"ACTV"},{"ID":"ddcdcc89-488a-4055-b6a3-2ae27c995e62","createdAt":null,"createdBy":null,"modifiedAt":null,"modifiedBy":null,"applicationID":"1bc6ba52-6a6a-430c-bc50-e647f0fc5d6a","layerID":"KB","layerType":"FEATURE","description":"KB palen","layerRelease":"2021","opacity":"1","gasunieLayer":true,"showInWidget":true,"position":20,"visible":true,"url":"a-gpl-server.gasunie.nl/arcgis/rest/services/Markering/FeatureServer","status":"ACTV"},{"ID":"426f185c-e04a-4751-b1f0-9ba70a8a07c3","createdAt":null,"createdBy":null,"modifiedAt":null,"modifiedBy":null,"applicationID":"1bc6ba52-6a6a-430c-bc50-e647f0fc5d6a","layerID":"STATION","layerType":"FEATURE","description":"Station","layerRelease":"2021","opacity":"1","gasunieLayer":true,"showInWidget":true,"position":10,"visible":true,"url":"a-gpl-server.gasunie.nl/arcgis/rest/services/Station/FeatureServer/0","status":"ACTV"}]';
            oDeferred.resolve(JSON.parse(sConfig));
            
            return oDeferred.promise();
        },

        setButtons: function(oInstance) {
            if (this.getShowHomeBtn()) {
                oInstance.addHomeButton();
            }

            if (this.getShowLocationBtn()) {
                oInstance.addLocationButton();
            }

            if (this.getShowLayerBtn()) {
                oInstance.addLayerButton();
            }

            if (this.getShowBaseLayerBtn()) {
                oInstance.addBaseLayerButton();
            }

            if (this.getShowDrawBtn()) {
                oInstance.addDrawButton(this.getEnableDrawPoint(), this.getEnableDrawPolygon(), this.getEnableDrawDelete());
            }

            if (this.getShowMeasureBtn()) {
                oInstance.addMeasureButton();
            }

            if (this.getShowXyBtn()) {
                oInstance.addXyButton(() => {
                    oMessageBox.error(this.getText("ERROR_XY_VALUE"));
                });
            }

            if (this.getShowInfoBtn()) {
                oInstance.addInfoButton();
            }
        },

        setEventHandlers: function(oInstance) {
            const nZero = 0;

            if (this.getEnableDataForLayers().length > nZero) {
                oInstance.activateGetDataFromMapExtent(this.getEnableDataForLayers(), (sLayerId, aData) => {
                    this.fireEvent("layerData", { layerID: sLayerId, data: aData });
                });
            }

            if (this.getEnableClickForLayers().length > nZero) {
                oInstance.addLayerEventHandler("click", this.getEnableClickForLayers(), (sLayerId, aData, oLayerConfig) => {
                    const aFeatures = aData.map((oData) => oData.feature);

                    this.highlightFeatures(sLayerId, aFeatures, true);
                    this.fireEvent("layerClick", { layerId: sLayerId, data: aData, layerConfig: oLayerConfig });
                });
            }

            if (this.getEnableDblClickForLayers().length > nZero) {
                oInstance.addLayerEventHandler("double-click", this.getEnableDblClickForLayers(), (sLayerId, aData, oLayerConfig) => {
                    const aFeatures = aData.map((oData) => oData.feature);

                    this.highlightFeatures(sLayerId, aFeatures, true);
                    this.fireEvent("layerDblClick", { layerId: sLayerId, data: aData, layerConfig: oLayerConfig });
                });
            }

            if (this.getEnableHoverForLayers().length > nZero) {
                oInstance.addLayerEventHandler("pointer-move", this.getEnableHoverForLayers(), (sLayerId, aData, oLayerConfig) => {
                    const aFeatures = aData.map((oData) => oData.feature);

                    this.highlightFeatures(sLayerId, aFeatures, true);
                    this.fireEvent("layerHover", { layerId: sLayerId, data: aData, layerConfig: oLayerConfig });
                });
            }
        },

        /**
         * WIDGET ENABLE
         */
        enableHomeWidget: function(bEnable) {
            this.getInstance().enableHomeWidget(bEnable);
        },
        enableLocationWidget: function(bEnable) {
            this.getInstance().enableLocationWidget(bEnable);
        },
        enableBaseLayerWidget: function(bEnable) {
            this.getInstance().enableBaseLayerWidget(bEnable);
        },
        enableLayerWidget: function(bEnable) {
            this.getInstance().enableLayerWidget(bEnable);
        },
        enableDrawWidget: function(bEnable) {
            this.getInstance().enableDrawWidget(bEnable);
        },
        enableMeasureWidget: function(bEnable) {
            this.getInstance().enableMeasureWidget(bEnable);
        },
        enableXyWidget: function(bEnable) {
            this.getInstance().enableXyWidget(bEnable);
        },

        /**
         * HOME
         */
        setHomeLocationForGeometryGraphics: function(aGeomGraphics) {
            this.getInstance().setHomeLocation(aGeomGraphics);
        },

        setHomeLocationForFeatures: function(aFeatures) {
            this.getInstance().setHomeLocation(aFeatures);
        },

        /**
         * NAVIGATION
         */
        navigateToFeatureWithQuery: async function(sLayerId, aFilters) {
            // aFilters [] { sId, sValue, sOperator, bAnd }
            const aFeatures = await this.getInstance().navigateToFeatureWithQuery(sLayerId, aFilters);

            return aFeatures;
        },

        navigateToFeature: function(oFeature) {
            this.getInstance().navigateToFeature(oFeature);
        },

        navigateToGeometries: function(aGeometries) {
            this.getInstance().navigateToGeometries(aGeometries);
        },

        navigateToGeometryGraphics: function(aGeomGraphics) {
            this.getInstance().navigateToGeometryGraphics(aGeomGraphics);
        },

        /**
         * HIGHLIGHT
         */
        highlightFeatures: function(sLayerId, aFeatures, bRemoveHighlightsFirst) {
            this.getInstance().highlightFeatures(sLayerId, aFeatures, bRemoveHighlightsFirst);
        },

        highlightGeometry: function(sReferenceID, bRemoveHighlightsFirst) {
            this.getInstance().highlightGeometry(sReferenceID, bRemoveHighlightsFirst);
        },

        highlightGraphics: function(sLayerId, aGraphics, bRemoveHighlightsFirst) {
            this.getInstance().highlightGraphics(sLayerId, aGraphics, bRemoveHighlightsFirst);
        },

        clearHighlighted: function() {
            this.getInstance().clearHighlighted();
        },

        /**
         * GEOMETRIES
         */
        subscribeGeometryCreated: function() {
            this.getInstance().subscribeGeometryCreated((oEvent) => {
                // oEvent = { graphic : object, geometry : object, referenceID : string }
                this.fireEvent("geometryCreated", oEvent);
            });
        },

        subscribeGeometryUpdated: function() {
            this.getInstance().subscribeGeometryUpdated((oEvent) => {
                // oEvent = { graphic : object, geometry : object, referenceID : string }
                this.fireEvent("geometryUpdated", oEvent);
            });
        },

        subscribeGeometryDeleted: function() {
            this.getInstance().subscribeGeometryDeleted((oEvent) => {
                // oEvent = { graphic : object, geometry : object, referenceID : string }
                this.fireEvent("geometryDeleted", oEvent);
            });
        },

        setGeometryReferenceID: function(oGraphic, sReferenceID) {
            this.getInstance().setGeometryReferenceID(oGraphic, sReferenceID);
        },

        addGeometriesToMap: function(aData, fnCallback) {
            // aData = [ { geometry : string, referenceID : string }]
            this.getInstance().addGeometriesToMap(aData, fnCallback);
        },

        calcGeometryDistances: function(aGraphics) {
            this.getInstance().calcGeometryDistances(aGraphics);
        },

        removeGeometriesFromMap: function() {
            this.getInstance().removeGeometriesFromMap();
        },

        /**
         * SPECIFIC FROM GZ APPLICATIONS
         * GENERATE DAMAGE GEOMETRY BASED ON REFERENCE GEOMETRY DATA (CROP OR CADASTRAL PARCEL)
         */
        // Used by Create Notification
        generateDamageGeometry: async function(oReferenceGeometryData) {
            // oReferenceGeometryData : Object { feature : {attributes, geometry, ... }, attributes : object }
            const oData = await this.getInstance().generateDamageGeometry(oReferenceGeometryData.feature.geometry, oReferenceGeometryData.attributes);

            return oData; // { details : { geometry, acreage }, metadata : { ... }}
        },

        // Used by Assess Notification
        generateDamageGeometryFromReference: async function(sLayersID, sReferenceID) {
            const oData = await this.getInstance().generateDamageGeometryFromReference(sLayersID, sReferenceID);

            return oData; // { details : { geometry, acreage }, metadata : { ... }}
        },

        // Used by Assess Notification
        addDamageReferenceGeometryToLayer: function(sLayersID, sReferenceID, sGeometry) {

            const sLayerTextId = `LAYER.DAMAGE_REFERENCE_${sLayersID}`;
            let sLayerTitle = this.getText(sLayerTextId);

            sLayerTitle = sLayerTitle === sLayerTextId ? this.getText("LAYER.DAMAGE_REFERENCE_PARCEL") : sLayerTitle;

            this.getInstance().addDamageReferenceLayer(sLayersID, sLayerTitle);

            const oGraphic = this.getInstance().addDamageReferenceGeometryToLayer(sLayersID, sReferenceID, sGeometry);

            return oGraphic;
        },

        // Used by Assess Notification
        resetDamageReferenceLayer: function() {
            this.getInstance().resetDamageReferenceLayer();
        },

        // Used by Assess Notification
        highlightDamageReferenceGraphic: function(sLayerID, aGraphics, bRemoveHighlightsFirst) {
            this.getInstance().highlightDamageReferenceGraphic(sLayerID, aGraphics, bRemoveHighlightsFirst);
        }

    });
});