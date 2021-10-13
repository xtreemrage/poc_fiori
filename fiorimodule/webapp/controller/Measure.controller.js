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

		return Controller.extend("nl.gasunie.poc.fiorimodule.controller.Measure", {
            onInit: function () {
                
                oEventBusUtil.subscribe("Tasklist.Task", this, this.handleTask);
                
                this._oJsonModel = new oJSONModel();
                this._oJsonData = {};
                this._oJsonModel.setProperty("/MeasureRegistration", this._oJsonData);	
                this.getView().setModel(this._oJsonModel, "local");
                
                this._initChart();
                
            },

            handleTask: async function(sChannel, sEvent, oTask){
                this.byId("measureCardId").setBusy(true);
                this.getView().bindElement("measure>/FunctionalLocationSearches('" + oTask.FunctionalLocationId + "')");  
                
                this.byId("measureHeaderCardId").setTitle(`Meetwaarden voor ${oTask.FunctionalLocationId}`)

                
                const oModel = this.getOwnerComponent().getModel("measure");
                const sUrl = "/FunctionalLocationSearches('" + oTask.FunctionalLocationId + "')/MeasurePoints";
                oModel.read(sUrl, {
                    success: (oData) => {
                        if(oData?.results?.length > 0){
                            const sMeasurePointId = oData.results[0].MeasurePointId; 
                            this.byId("MeasurePoint").setSelectedKey(sMeasurePointId);
                            this.byId("MeasurePoint").fireChange({ value: sMeasurePointId });
                        }else{
                            this.byId("MeasurePoint").clearSelection();
                            this._oJsonData.MeasureDocuments = [];
                            this._oJsonModel.updateBindings();
                            this.initMeasureDocumentsChart();
                            
                            this.byId("measureCardId").setBusy(false);
                        }
                    },
                    error: (oError) => {
                        console.error(oError)
                        this.byId("measureCardId").setBusy(false);
                    }
                })


            },

            handleMeasurePoint: function(oEvent){
                this.byId("measureCardId").setBusy(true);
                const sMeasurePoint = oEvent.getSource().getSelectedKey();
                const oModel = this.getOwnerComponent().getModel("measure");
                const sUrl = "/MeasurePoints('"+sMeasurePoint+"')/MeasureDocuments";
                oModel.read(sUrl, {
                    success: (oData) => {
                        this._oJsonData.MeasureDocuments = oData.results;
                        this.initMeasureDocumentsChart();
                        this.byId("measureCardId").setBusy(false);
                    },
                    error: (oError) => {
                        console.error(oError)
                        this.byId("measureCardId").setBusy(false);
                    }
                })
            },

            initMeasureDocumentsChart: function (oData) {
                // Sort data based on measuredocument ID
                var sortData = JSON.parse(JSON.stringify(this._oJsonData.MeasureDocuments)); // Copy data
                sortData.sort(function (oValue1, oValue2) {
                    var value1 = oValue1.MeasureDate + oValue1.MeasureTime;
                    var value2 = oValue2.MeasureDate + oValue2.MeasureTime;
                    return (value1 < value2) ? -1 : (value1 > value2) ? 1 : 0;
                });

                // Set ID multiple date values and calculate average value
                var measureUnit = null;
                sortData.forEach(function (oItem) {
                    oItem.Id = oItem.MeasureDate + " " + oItem.MeasureTime;
                    oItem.IdSort = oItem.MeasureDate + oItem.MeasureTime; // Table sort
                    measureUnit = oItem.ValueProps.UnitDescription;

                    // FIX decimal values: replace , for . Otherwise the chart will not display any data!!!
                    // Values with no decimals will be extend with 2 decimals!
                    if (oItem.ValueProps.Decimals > 0) {
                        oItem.ValueGraph = String(oItem.Value).split(",").join(".");
                    } else {
                        oItem.ValueGraph = oItem.Value += ".00";
                        oItem.Value = String(oItem.Value).split(",").join(".");
                    }
                });

                // Set data into model
                this._oJsonData.MeasureDocumentsChart = sortData;

                // Set min counter value
                // var isCounter = this.getView().getModel("odata").getProperty("/MeasurePoints('1317540')").CounterIndicator;
                // this._oJsonData.MinMeasureCounterValue = this._oJsonData.MeasureDocumentsChart && isCounter ?
                //     this._oJsonData.MeasureDocumentsChart[this._oJsonData.MeasureDocumentsChart.length - 1].Value : 0;

                // Update model
                this._oJsonModel.updateBindings();

                // Set header title
                var vizFrame = this.getView().byId("MeasureVizFrame");
                vizFrame.setVizProperties({
                    title: {
                        text: "Meetwaarden",
                    }
                });
                this.byId("measureCardId").setBusy(false);
            },

            _initChart : function() {            
                var xLabel = "Datum";
                var yLabel = "Meetwaarde";

                var vizFrame = this.getView().byId("MeasureVizFrame");
                var dataset = new sap.viz.ui5.data.FlattenedDataset({
                    dimensions : [ {
                        name : xLabel,
                        value : "{Id}"
                    } ],
                    measures : [ {
                        group : 1,
                        name : yLabel,
                        value : "{ValueGraph}"
                    } ],
                    data : {
                        path : "/MeasureRegistration/MeasureDocumentsChart"
                    }
                });
                
                vizFrame.setVizProperties({
                    interaction: {
                        behaviorType: null
                    },
                    title : {
                        text : "Historische meetwaarden",
                        visible : true,
                    },          
                    tooltip:{
                        visible : true,
                        bodyDimensionLabel : xLabel,
                        bodyDimensionValue : yLabel
                    },
                    valueAxis: {
                        title: {
                            visible: false
                        }
                    },
                    categoryAxis: {
                        title: {
                            visible: false
                        }
                    },
                });
                vizFrame.setDataset(dataset);
                vizFrame.setModel(this._oJsonModel);

                var feedPrimaryValues = new sap.viz.ui5.controls.common.feeds.FeedItem({
                    uid : "primaryValues",
                    type : "Measure",
                    values : [ yLabel ]
                });
                var feedAxisLabels = new sap.viz.ui5.controls.common.feeds.FeedItem({
                    uid : "axisLabels",
                    type : "Dimension",
                    values : [ xLabel ]
                });
                var feedTargetValues = new sap.viz.ui5.controls.common.feeds.FeedItem({
                    uid : "targetValues",
                    type : "Measure",
                    values : [ yLabel ]
                });

                vizFrame.addFeed(feedPrimaryValues);
                vizFrame.addFeed(feedAxisLabels);
                vizFrame.addFeed(feedTargetValues);
                vizFrame.setVizType("column");
                
            },
                
            setChartType: function(){
                var chartSelect = this.getView().byId("MeasureDocumentsChartSelect");
                var vizFrame = this.getView().byId("MeasureVizFrame");
                vizFrame.setVizType(chartSelect.getSelectedKey());
            },
            
		});
	});