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
                this._oJsonModel.setProperty("/ShiftNote", this._oJsonData);
                this.getView().setModel(this._oJsonModel, "local");
                
                //this._initList();
                
            },
            
            handleTask: async function(sChannel, sEvent, oTask){
                this.byId("shiftnoteCardId").setBusy(true);
                
                this.byId("shiftnoteHeaderCardId").setTitle(`Wachtnotities voor ${oTask.FunctionalLocationId}`)

                
                const oModel = this.getOwnerComponent().getModel("shiftNote");
                //const sUrl = "/ShiftNoteVariants('%2FSTANDAARD')/ShiftNotes?$skip=0&$top=999999&$orderby=ShiftNoteId asc&$filter=substringof('" + oTask.FunctionalLocationId + "',Label) and (StartDate ge '20210701' and StartDate le '20211031')";
                //const sUrl = "/ShiftNoteVariants('%2FSTANDAARD')/ShiftNotes?$skip=0&$top=999999&$orderby=ShiftNoteId asc&$filter=substringof('S-489-901-HV-121',Label) and (StartDate ge '20210101' and StartDate le '20211013')";
                //const sUrl = "/ShiftNoteVariants('OLDEBOORN%20JUMP')/ShiftNotes?$skip=0&$top=999999&$orderby=ShiftNoteId asc";
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
                    success: (oData) => {
                        if(oData?.results?.length > 0){
                            debugger;
                            // const sMeasurePointId = oData.results[0].MeasurePointId; 
                            // this.byId("MeasurePoint").setSelectedKey(sMeasurePointId);
                            // this.byId("MeasurePoint").fireChange({ value: sMeasurePointId });
                        }else{
                            // this.byId("MeasurePoint").clearSelection();
                            // this._oJsonData.MeasureDocuments = [];
                            // this._oJsonModel.updateBindings();
                            // this.initMeasureDocumentsChart();
                            debugger;
                            this.byId("shiftnoteCardId").setBusy(false);
                        }
                    },
                    error: (oError) => {
                        console.error(oError)
                        this.byId("shiftnoteCardId").setBusy(false);
                    }
                }) 
            },
            
            handleShiftnotes: function(oEvent){
                const sFpl = oEvent.getSource().getSelectedKey();
                const oModel = this.getOwnerComponent().getModel("shiftNote");
                const sUrl = "/ShiftNoteVariants('/STANDAARD')/ShiftNotes?$skip=0&$top=999999&$orderby=ShiftNoteId%20asc&$filter=substringof('" + this._sFunctionLocationId + "',Label)%20and%20(StartDate%20ge%20%2720210701%27%20and%20StartDate%20le%20%2720211031%27)&$select=ShiftNoteId%2cShiftNoteDescription%2cCreatedBy%2cFunctionalLocationId%2cFunctionalLocationDescription%2cEquipmentId%2cEquipmentDescription%2cCategoryId%2cCategoryDescription%2cStartDate%2cStartTime%2cEndDate%2cEndTime%2cNotificationNumber%2cOrderNumber%2cCreationDate%2cChangeDate";
                oModel.read(sUrl, {
                    success: (oData) => {
                        this._oJsonData.ShiftNotes = oData.results;
                        //this.initShiftNotesList();
                    },
                    error: (oError) => {
                        debugger;
                    }
                })

            },

		});
	});