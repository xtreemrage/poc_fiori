sap.ui.define([
		"sap/ui/core/mvc/Controller",
        "nl/gasunie/poc/fiorimodule/helper/EventBusUtil",
	],
	/**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
	function (Controller, oEventBusUtil) {
		"use strict";

		return Controller.extend("nl.gasunie.poc.fiorimodule.controller.Esri", {
			onInit: function () {
                
                oEventBusUtil.subscribe("Tasklist.Task", this, this.handleTask);

                this.loadMap();
            },

            loadMap: function () {
                
                this.byId("esriCardId").setBusy(true);
                
                sap.ui.require(["nl/gasunie/poc/fiorimodule/esri/EsriControl"], (oEsriControl) => {

                    this.oEsriControl = new oEsriControl({
                        applicationID: "1234",

                        showHomeBtn: true,
                        showLocationBtn: true,
                        showLayerBtn: true,
                        showBaseLayerBtn: true,

                        afterLoading: this.handleAfterLoadingEsri.bind(this),
                        errorLoading: this.handleErrorLoadingEsri.bind(this),
                        unexpectedFailure: this.handleUnexpectedFailureEsri.bind(this)
                    });
                    
                    const oLayout = this.getView().byId("layout");
                    oLayout.destroyItems();
                    oLayout.addItem(this.oEsriControl)
                });


            },
            handleAfterLoadingEsri: function () {
                console.error("ESRI instance loaded")
                this.byId("esriCardId").setBusy(false);
            },
            handleErrorLoadingEsri: function (oEvent) {
                console.error("ESRI instance failed");
                console.error(oEvent);
                this.byId("esriCardId").setBusy(false);
            },
            handleUnexpectedFailureEsri: function () {
                console.error("ESRI instance failed hard");
                this.byId("esriCardId").setBusy(false);
            },

            handleTask: async function(sChannel, sEvent, oTask){
                const aFpl = oTask.FunctionalLocationId.split("-")
                const sLocation = [aFpl[0],aFpl[1]].join("-");

                const aFilters = [{ id: "LogischNummer", value: sLocation }];
                const oFeatures = await this.oEsriControl.navigateToFeatureWithQuery("STATION", aFilters);
                this.oEsriControl.highlightFeatures("STATION", oFeatures, true);
                        
            }
		});
	});
