sap.ui.define([
		"sap/ui/core/mvc/Controller",
        "sap/ui/model/json/JSONModel",
        "nl/gasunie/poc/fiorimodule/helper/EventBusUtil",
	],
	/**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
	function (Controller, oJSONModel, oEventBusUtil) {
		"use strict";

		return Controller.extend("nl.gasunie.poc.fiorimodule.controller.Shiftnote", {
			onInit: function () {
                
                oEventBusUtil.subscribe("Tasklist.Task", this, this.handleTask);
                
                this._oJsonModel = new oJSONModel();
                this._oJsonData = {};
                this._oJsonModel.setProperty("/ShiftNotes", this._oJsonData);
                this.getView().setModel(this._oJsonModel, "local");
                
            },
            
            handleTask: async function(sChannel, sEvent, oTask){
                this.byId("shiftnoteCardId").setBusy(true);
                
                this.byId("shiftnoteHeaderCardId").setTitle(`Wachtnotities voor ${oTask.FunctionalLocationId}`)

                
                const oModel = this.getOwnerComponent().getModel("shiftNote");
                const sUrl = "/ShiftNoteVariants('%2FSTANDAARD')/ShiftNotes";
                const aFilters = [];

                var filterFpl = new sap.ui.model.Filter({
					path : "Label",
					operator : sap.ui.model.FilterOperator.Contains,
					value1 : oTask.FunctionalLocationId
				});
                aFilters.push(filterFpl);
                
                var filterStartDateGE = new sap.ui.model.Filter({
					path : "StartDate",
					operator : sap.ui.model.FilterOperator.GE,
					value1 : '20210101'
				});
                aFilters.push(filterStartDateGE);
                
                var filterStartDateLE = new sap.ui.model.Filter({
					path : "StartDate",
					operator : sap.ui.model.FilterOperator.LE,
					value1 : '20211013'
				});
				aFilters.push(filterStartDateLE);

                
                oModel.read(sUrl, {
                    filters: aFilters,
                    urlParameters: {
                        "$skip":0,
                        "$top":5                                                                
                    },
                    success: (oData) => {
                        if(oData?.results?.length > 0){
                            this._oJsonData.ShiftNotes = oData.results;
                            this._oJsonModel.updateBindings();
                            this.byId("shiftnoteCardId").setBusy(false);
                        }else{
                            this._oJsonData.ShiftNotes = [];
                            this._oJsonModel.updateBindings();
                            this.byId("shiftnoteCardId").setBusy(false);
                        }
                    },
                    error: (oError) => {
                        console.error(oError)
                        this.byId("shiftnoteCardId").setBusy(false);
                    }
                }) 
            },

            onSelectShiftnote: function(oEvent){
                var oListItem = oEvent.getParameters().listItem;   
                var oBc = oListItem.getBindingContext("local");
                var oContext = oBc.getModel().getProperty(oBc.getPath());
                
                var shiftNoteid = oContext.ShiftNoteId;
            },      
                            
		});
	});