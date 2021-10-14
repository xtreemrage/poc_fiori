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

		return Controller.extend("nl.gasunie.poc.fiorimodule.controller.ShiftnoteText", {
			onInit: function () {
                
                oEventBusUtil.subscribe("ShiftNote.showShiftnote", this, this.handleShiftnote);
                
                this._oJsonModel = new oJSONModel();
                this._oJsonData = {};
                this._oJsonModel.setProperty("/ShiftNotesText", this._oJsonData);
                this.getView().setModel(this._oJsonModel, "local");
                
            },
            
            handleShiftnote: async function(sChannel, sEvent, oShiftNote){
                this.byId("shiftnoteTextCardId").setBusy(true);
                
                this.byId("shiftnoteTextHeaderCardId").setTitle(`Wachtnotitie details voor ${oShiftNote.ShiftNoteId}`);
                this.byId("shiftnoteDetailTextId").setText(oShiftNote.LongDescription);              
                this.byId("shiftnoteTextCardId").setBusy(false);
            },   
                            
		});
	});