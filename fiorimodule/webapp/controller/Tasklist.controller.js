sap.ui.define([
		"sap/ui/core/mvc/Controller",
        "nl/gasunie/poc/fiorimodule/helper/EventBusUtil",
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator"
	],
	/**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
	function (Controller, oEventBusUtil, oFilter, oFilterOperator) {
		"use strict";

		return Controller.extend("nl.gasunie.poc.fiorimodule.controller.Tasklist", {
			onInit: function () {

            },

            onFilterTasklist: function(oEvent){
                const sFilterValue = oEvent.getSource().getSelectedKey();
                const oList = this.byId("tasklistId");
                const aFilter = sFilterValue ? [new oFilter("HWK", oFilterOperator.Contains, sFilterValue)] : null;             

                oList.getBinding("items").filter(aFilter);
            },
            
            onSelectTasks: function(oEvent){  

                const oListItem = oEvent.getParameters().listItem;   
                const oBc = oListItem.getBindingContext("taskList");
                const oContext = oBc.getModel().getProperty(oBc.getPath());
                           
                oEventBusUtil.publish("Tasklist.Task", this, oContext);
            }
		});
	});