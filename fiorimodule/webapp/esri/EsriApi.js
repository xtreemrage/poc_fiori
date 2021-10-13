sap.ui.define([
    "sap/base/Log"
], (oLog) => {

    // https://developers.arcgis.com/javascript/latest/esri-icon-font/

    const EsriApi = function(oData) {
        initInstanceVariables(this, oData);

        this.loadEsriHtml(
            oData.html,
            async () => {
                try {
                    await this.loadImports();
                    this.loadEsriMap();
                    await this.loadApplicationLayers();
                    oData.success(this);
                } catch (oError) {
                    oData.error(oError);
                }
            },
            oData.error
        );
    };

    const initInstanceVariables = (oInstance, oData) => {

        oInstance.sId = createGuid();
        oInstance.sAppId = oData.appId;
        oInstance.oReference = { config: oData.config, map: null, view: null, home: null };

        oInstance.bEsriConnectionDirectly = null;
        oInstance.oLayers = {};
        oInstance.bDrawActive = false;
        oInstance.bMeasureActive = false;
        oInstance.aHighlightedObjects = [];
        oInstance.oLayerEventCallbacks = {};
        oInstance.oExpandButtons = {};

        oInstance.fnUnexpectedFailure =
            oData.unexpectedFailure ||
            oLog.error("EsriApi | initInstanceVariables() | Callback function fnUnexpectedFailure() not set.");

        oInstance.fnPublishGeometryCreated = (oData) => {
            const sMessage = `EsriApi | fnPublishGeometryCreated | Callback function fnPublishGeometryCreated() not set. Input parameter: ${JSON.stringify(oData)}.`;

            oLog.error(sMessage);

            return sMessage;
        },

        oInstance.fnPublishGeometryUpdated = (oData) => {
            const sMessage = `EsriApi | fnPublishGeometryUpdated | Callback function fnPublishGeometryUpdated() not set. Input parameter: ${JSON.stringify(oData)}.`;

            oLog.error(sMessage);

            return sMessage;
        },

        oInstance.fnPublishGeometryDeleted = (oData) => {
            const sMessage = `EsriApi | fnPublishGeometryDeleted | Callback function fnPublishGeometryDeleted() not set. Input parameter: ${JSON.stringify(oData)}.`;

            oLog.error(sMessage);

            return sMessage;
        };

    };

    const createGuid = () => {
        const n0 = 0, n1 = 1, nCalc = 0x10000, n16 = 16;

        return (((n1 + Math.random()) * nCalc) | n0).toString(n16).substring(n1);
    };

    EsriApi.prototype = {

        /**
         * LOAD ESRI HTML AND MAP
         */
        loadEsriHtml: async function(oHtml, fnSuccess, fnError) {
            try {
                const sHtml = await this.loadHtml("EsriBase");

                oHtml.setContent(sHtml);
                await this.checkEsriHtmlLoaded("EsriMap");
                fnSuccess();
            } catch (oError) {
                fnError(oError);
            }
        },

        loadEsriMap: function() {
            const { WebMap } = this.imports;
            const { MapView } = this.imports;
            const { ScaleBar } = this.imports;

            const aBaseMap = this.getDefaultApplicationBaseLayers();
            const oMap = new WebMap({ basemap: aBaseMap });

            const n28992 = 28992;
            const oView = new MapView({
                map: oMap,
                container: this.getInstanceElementId("EsriMap"),
                spatialReference: n28992
            });

            const oScaleWidget = new ScaleBar({ view: oView, unit: "metric" });

            oView.ui.add(oScaleWidget, { position: "bottom-left" });

            this.setMap(oMap);
            this.setView(oView);
            this.setDefaultViewExtent();
        },

        setDefaultViewExtent: function() {
            const { Extent } = this.imports;

            const nXmin = -63820.54546582507,
                nYmin = 323715.62643384817,
                nXmax = 327135.54506188264,
                nYmax = 623346.8176898492,
                nSrid = 28992;

            this.getView().extent = new Extent({
                xmin: nXmin,
                ymin: nYmin,
                xmax: nXmax,
                ymax: nYmax,
                spatialReference: {
                    wkid: nSrid
                }
            });
        },

        /**
         * HOME
         */
        addHomeButton: function() {
            const { Home } = this.imports;
            const oView = this.getView();
            const oWidget = new Home({ view: oView });

            oView.ui.add(oWidget, "top-left");
            this.setHome(oWidget);
            this.setWidgetButton("HOME", oWidget);
        },

        setHomeLocation: function(aData) {
            // aData = array of geometries or features
            const { Viewpoint } = this.imports;
            const { geometryEngine } = this.imports;

            const aGeometries = aData.map((oGraphic) => oGraphic.geometry.toJSON());
            const oGeometry = geometryEngine.union(aGeometries);
            const oVp = new Viewpoint({ targetGeometry: oGeometry.extent });

            this.getHome().viewpoint = oVp;
        },

        /**
         * LOCATION
         */
        addLocationButton: function() {
            const { Track } = this.imports;
            const oView = this.getView();
            const oWidget = new Track({ view: oView });

            oView.ui.add(oWidget, "top-left");
            this.setWidgetButton("LOCATION", oWidget);
        },

        /**
         * NAVIGATION
         */
        navigateToFeature: function(oFeature) {
            const oView = this.getView();
            const n1 = 1;

            oView.goTo(oFeature.geometry.extent.expand(n1));
        },

        navigateToFeatureWithQuery: async function(sLayerId, aFilters) {
            const oView = this.getView();
            const oEsriLayer = this.getLayer(sLayerId);

            const oQuery = oEsriLayer.createQuery();

            oQuery.where = this.createQueryWhereFromFilter(aFilters);
            oQuery.outSpatialReference = this.getView().spatialReference;
            oQuery.returnGeometry = true;

            const oResults = await oEsriLayer.queryFeatures(oQuery);
            const oExtent = this.getExtentFromFeatures(oResults.features);

            if (oExtent) {
                const n1 = 1;

                oView.goTo(oExtent.expand(n1));
            }

            oView.scale = 1000;

            return oResults.features;
        },

        getExtentFromFeatures: function(aFeatures) {
            const n0 = 0, n1 = 1;

            if (aFeatures?.length > n0) {
                let oExtent = this.getExtentFeature(aFeatures[0]);

                aFeatures.forEach((oFeature) => {
                    oExtent = oExtent.union(this.getExtentFeature(oFeature));
                });

                return oExtent;
            }
        },

        getExtentFeature: function(oFeature){
            let oExtent = oFeature.geometry.extent;
            const oGeometry = oFeature.geometry;
            if(!oExtent){
                const { Extent } = this.imports;
                oExtent = new Extent({
                    xmax : oGeometry.x,
                    xmin : oGeometry.x,
                    ymax : oGeometry.y,
                    ymin : oGeometry.y,
                    spatialReference : oGeometry.spatialReference                                              
                })
            }
            return oExtent;            
        },

        navigateToGeometries: function(aGeometries) {
            const aGeomGraphics = aGeometries.map((oGeometry) => this.getGeometryGraphic(oGeometry));

            this.navigateToGeometryGraphics(aGeomGraphics);
        },

        navigateToGeometryGraphics: function(aGeomGraphics) {
            this.getView().goTo(aGeomGraphics);
        },

        /**
         * LAYERS
         */
        loadApplicationLayers: async function() {
            const { FeatureLayer } = this.imports;
            const { MapImageLayer } = this.imports;

            const oMap = this.getMap();
            const aLayerData = this.getLayerConfig() || [];
            let oLayer = null;

            for (const oLayerData of aLayerData) {
                if (oLayerData.layerType === "FEATURE" && oLayerData.url) {
                    oLayer = new FeatureLayer({
                        id: oLayerData.layerID,
                        url: await this.getApplicationLayerUrl(oLayerData.url, oLayerData.gasunieLayer),
                        title: oLayerData.description,
                        visible: oLayerData.visible,
                        opacity: oLayerData.opacity,
                        listMode: oLayerData.showInWidget ? "show" : "hide",
                        outFields: ["*"]
                    });
                } else if (oLayerData.layerType === "MAPIMAGE" && oLayerData.url) {
                    oLayer = new MapImageLayer({
                        id: oLayerData.layerID,
                        url: await this.getApplicationLayerUrl(oLayerData.url, oLayerData.gasunieLayer),
                        title: oLayerData.description,
                        visible: oLayerData.visible,
                        opacity: oLayerData.opacity,
                        listMode: oLayerData.showInWidget ? "show" : "hide",
                        outFields: ["*"]
                    });
                } else {
                    oLayer = null;
                    oLog.error(`EsriApi | loadApplicationLayers() | Unsupported layertype for ${JSON.stringify(oLayerData)}.`);
                }

                if (oLayer) {
                    this.setLayer(oLayerData.layerID, oLayer, "APPLICATIONLAYER");
                    oMap.layers.push(oLayer);
                }
            }
        },

        getApplicationLayerUrl: async function(sUrl, bGasunieLayer) {
            if (bGasunieLayer) {
                const bDirectly = await this.checkEsriConnectionDirectly();
                const sModule = this.getApplicationModulePath();

                return bDirectly ? `https://${sUrl}` : sModule + sUrl;
            }

            return sUrl;
        },

        getApplicationModulePath: function() {
            return `/sapbtpgenesri.nlgasuniegenesrifiorimodule/~${new Date().getTime()}~/`;
        },

        checkEsriConnectionDirectly: function() {
            const oDeferred = $.Deferred();

            if (this.bEsriConnectionDirectly === null) {

                // We only check if we can reach the acceptance GPL server
                // The server is only reachable when connected to the Gasunie network
                // Otherwise, the connection will be handled by SAP SCC
                $.ajax("https://a-gpl-server.gasunie.nl/arcgis/rest/services/", {
                    async: false,
                    success: () => {
                        this.bEsriConnectionDirectly = true;
                        oDeferred.resolve(true);
                    },
                    error: () => {
                        this.bEsriConnectionDirectly = false;
                        oDeferred.resolve(false);
                    }
                });

            } else {
                return this.bEsriConnectionDirectly;
            }

            return oDeferred.promise();
        },

        addLayerButton: function() {
            const { LayerList } = this.imports;
            const { Expand } = this.imports;

            const oWidget = new LayerList({
                view: this.getView()
            });
            const oExpandButton = new Expand({
                view: this.getView(),
                content: oWidget,
                group: "top-right"
            });

            this.getView().ui.add(oExpandButton, "top-right");
            this.setWidgetButton("LAYER", oExpandButton);
        },

        /**
         * BASELAYERS
         */
        addBaseLayerButton: function() {
            const { BasemapGallery } = this.imports;
            const { Expand } = this.imports;

            const oView = this.getView();
            const aBaseConfig = this.getBaseLayerConfig() || [];

            const aBaseMaps = this.createApplicationBaseLayerBaseMap(aBaseConfig);
            const oWidget = new BasemapGallery({ view: oView, source: aBaseMaps });
            const oExpandButton = new Expand({
                view: oView,
                content: oWidget,
                group: "top-right"
            });

            this.getView().ui.add(oExpandButton, "top-right");
            this.setWidgetButton("BASELAYER", oExpandButton);
        },

        getDefaultApplicationBaseLayers: function() {
            const n0 = 0, n1 = 1;
            const aBaseConfig = this.getBaseLayerConfig() || [];
            const aDefaultLayers = aBaseConfig.filter((oBaseLayer) => oBaseLayer.defaultLayer);
            let aBasemaps = null;

            if (aDefaultLayers.length === n1) {
                aBasemaps = this.createApplicationBaseLayerBaseMap(aDefaultLayers);

                return aBasemaps[n0];

            } else if (aDefaultLayers.length === n0) {
                oLog.error("EsriApi | getDefaultApplicationBaseLayers() | No default baselayers found. Fallback to OSM baselayer.");

                aBasemaps = this.createApplicationBaseLayerBaseMap();

                return aBasemaps[n0];
            }

            oLog.error("EsriApi | getDefaultApplicationBaseLayers() | Multiple default baselayers found, first default baselayer selected.");

            aBasemaps = this.createApplicationBaseLayerBaseMap(aDefaultLayers);

            return aBasemaps[n0];
        },

        createApplicationBaseLayerBaseMap: function(aBaseLayerData) {
            const { MapImageLayer } = this.imports;
            const { VectorTileLayer } = this.imports;
            const { Basemap } = this.imports;

            const aBaseMaps = [];

            if (aBaseLayerData) {
                aBaseLayerData.forEach((oBaseLayerData) => {
                    let oBaseLayer = null;

                    if (oBaseLayerData.layerType === "MAPIMAGE" && oBaseLayerData.url) {
                        oBaseLayer = new MapImageLayer({
                            id: oBaseLayerData.baseLayerID,
                            url: oBaseLayerData.url,
                            title: oBaseLayerData.description
                        });

                    } else if (oBaseLayerData.layerType === "VECTOR" && oBaseLayerData.url) {
                        oBaseLayer = new VectorTileLayer({
                            id: oBaseLayerData.baseLayerID,
                            url: oBaseLayerData.url,
                            title: oBaseLayerData.description
                        });

                        // ADD EXTRA LAYERTYPES WHEN NEEDED...

                    } else {
                        oLog.error(`EsriApi | createApplicationBaseLayer() | Unsupported layertype for ${JSON.stringify(oBaseLayerData)}.`);
                    }

                    if (oBaseLayer) {
                        aBaseMaps.push(new Basemap({
                            baseLayers: [oBaseLayer],
                            title: oBaseLayerData.description,
                            thumbnailUrl: oBaseLayerData.urlThumbnail
                        }));
                    }
                });

            } else {
                aBaseMaps.push(Basemap.fromId("osm"));
            }

            return aBaseMaps;
        },

        /**
         * DRAW
         */
        addDrawButton: function(bEnableDrawPoint, bEnableDrawPolygon, bEnableDelete) {
            const { Sketch } = this.imports;
            const { Expand } = this.imports;

            this.addGeometryLayer();
            const oGeomLayer = this.getLayer("GEOM_LAYER");
            const oView = this.getView();

            const aFeatureSources = [{ layer: oGeomLayer }];

            // Add extra layers for snapping
            ["RVOGEWAS-P", "RVOGEWAS-G", "PIPELINE",
                "BUFFERZONE5", "BUFFERZONE10", "BUFFERZONE15", "BUFFERZONE20", "BUFFERZONE25", "BUFFERZONE30",
                "DAMAGEZONES"].forEach((sLayer) => {
                const oLayer = this.getLayer(sLayer);

                if (oLayer) {
                    aFeatureSources.push({ layer: oLayer });
                }
            });

            const oWidget = new Sketch({
                layer: oGeomLayer,
                view: oView,
                creationMode: "single",
                snappingOptions: { // autocasts to SnappingOptions()
                    enabled: true,
                    featureSources: aFeatureSources
                }
            });

            if (!bEnableDelete) {
                // Sketch widget doesn't support disable delete button, that's why using styleclass
                const oEsriDiv = document.getElementById(this.getInstanceElementId("EsriDiv"));

                oEsriDiv.classList.add("guEsriDisableDrawDeleteButton");
            }

            oWidget.visibleElements = {
                createTools: {
                    point: bEnableDrawPoint,
                    polygon: bEnableDrawPolygon,
                    polyline: false,
                    rectangle: false,
                    circle: false
                },
                selectionTools: {
                    "lasso-selection": false
                },
                settingsMenu: false
            };
            oWidget.on("create", (oEvent) => {
                this.handleGeometryCreated(oEvent);
            });
            oWidget.on("update", (oEvent) => {
                this.handleGeometryUpdated(oEvent);
            });
            oWidget.on("redo", (oEvent) => {
                this.handleGeometryUpdated(oEvent);
            });
            oWidget.on("undo", (oEvent) => {
                this.handleGeometryUpdated(oEvent);
            });
            oWidget.on("delete", (oEvent) => {
                this.handleGeometryUpdated(oEvent);
            });
            const oExpandButton = new Expand({
                view: oView,
                content: oWidget,
                group: "top-right"
            });

            oView.ui.add(oExpandButton, "top-right");
            this.setWidgetButton("DRAW", oExpandButton);
        },

        /**
         * GEOMETRIES
         */
        addGeometryLayer: function() {
            const { GraphicsLayer } = this.imports;

            if (this.getLayer("GEOM_LAYER")) {
                return;
            }

            const oGeomLayer = new GraphicsLayer({
                id: "GEOM_LAYER",
                title: "Geometrie",
                listMode: "show"
            });
            const oGeomDistanceResultLayer = new GraphicsLayer({
                id: "GEOM_DISTANCE_RESULT_LAYER",
                title: "Geometrie afstand en oppervlakte",
                listMode: "show",
                minScale: 2000,
                maxScale: 0
            });
            const oGeomDistanceLiveLayer = new GraphicsLayer({
                id: "GEOM_DISTANCE_LIVE_LAYER",
                title: "Geometrie intekenen",
                listMode: "hide"
            });

            this.setLayer("GEOM_LAYER", oGeomLayer, "GEOM");
            this.setLayer("GEOM_DISTANCE_RESULT_LAYER", oGeomDistanceResultLayer, "GEOM");
            this.setLayer("GEOM_DISTANCE_LIVE_LAYER", oGeomDistanceLiveLayer, "GEOM");

            const n1000 = 1000, n1001 = 1001, n1002 = 1002;

            this.getMap().add(oGeomLayer, n1000); // On toplevel layer
            this.getMap().add(oGeomDistanceResultLayer, n1001);
            this.getMap().add(oGeomDistanceLiveLayer, n1002);
        },

        handleGeometryCreated: function(oEvent) {

            this.setDrawActive(true); // in order to disable click event on layer
            this.clearHighlighted();

            const bAdd = oEvent.toolEventInfo?.type === "vertex-add";
            const bCurserUpdate = oEvent.toolEventInfo?.type === "cursor-update";
            const bStart = oEvent.state === "start";
            const bComplete = oEvent.state === "complete";
            const oGraphic = oEvent.graphic;

            const bPolygon = oEvent.tool === "polygon";
            const bPoint = oEvent.tool === "point";

            this.clearGeometryDistanceLive();

            if (bPolygon) {
                if (bStart) {
                    oGraphic.setAttribute("relationID", createGuid());
                }

                if (bAdd) {
                    this.processGeometryDistances("GEOM_DISTANCE_RESULT_LAYER", oGraphic, false, false);

                } else if (bCurserUpdate) {
                    this.processGeometryDistances("GEOM_DISTANCE_LIVE_LAYER", oGraphic, false, false);

                } else if (bComplete) {
                    this.processGeometryDistances("GEOM_DISTANCE_RESULT_LAYER", oGraphic, true, true);
                    const nAcreage = this.processGeometryAcreage("GEOM_DISTANCE_RESULT_LAYER", oGraphic);

                    this.fnPublishGeometryCreated({
                        graphic: oGraphic,
                        geometry: oGraphic.geometry,
                        referenceID: null, // set with function setGeometryReferenceID from application
                        acreage: nAcreage
                    });
                    this.setDrawActive(false);
                }

            } else if (bPoint) {
                this.fnPublishGeometryCreated({
                    graphic: oGraphic,
                    geometry: oGraphic.geometry,
                    referenceID: null // set with function setGeometryReferenceID from application
                });
                this.setDrawActive(false);
            }
        },

        handleGeometryUpdated: function(oEvent) {

            this.setDrawActive(true); // in order to disable click event on layer
            this.clearHighlighted();

            const aGraphics = oEvent.graphics;
            const bDelete = oEvent.type === "delete";
            const bUndo = oEvent.type === "undo";
            const bRedo = oEvent.type === "redo";
            const bActive = oEvent.state === "active";
            const bComplete = oEvent.state === "complete";
            const bMoveStop = oEvent.toolEventInfo?.type === "move-stop";
            const bScaleStop = oEvent.toolEventInfo?.type === "scale-stop";

            aGraphics.forEach((oGraphic) => {
                const sRelationID = oGraphic.getAttribute("relationID");

                if (bDelete) {
                    this.clearGeometryDistanceLive();
                    this.clearGeometryDistanceForGraphic(sRelationID);
                    this.fnPublishGeometryDeleted({
                        graphic: oGraphic,
                        geometry: oGraphic.geometry,
                        referenceID: oGraphic.getAttribute("referenceID")
                    });

                } else if (bActive) {
                    this.clearGeometryDistanceLive();
                    this.clearGeometryDistanceForGraphic(sRelationID);
                    this.processGeometryDistances("GEOM_DISTANCE_LIVE_LAYER", oGraphic, true, false);

                } else if (bComplete || bMoveStop || bScaleStop || bUndo || bRedo) {
                    this.clearGeometryDistanceLive();
                    this.processGeometryDistances("GEOM_DISTANCE_RESULT_LAYER", oGraphic, true, true);
                    const nAcreage = this.processGeometryAcreage("GEOM_DISTANCE_RESULT_LAYER", oGraphic);

                    this.fnPublishGeometryUpdated({
                        graphic: oGraphic,
                        geometry: oGraphic.geometry,
                        referenceID: oGraphic.getAttribute("referenceID"),
                        acreage: nAcreage
                    });

                    this.setDrawActive(false);
                }
            });
        },

        processGeometryDistances: function(sLayerID, oGraphicInfo, bAllDistances, bCompleted) {
            const { Graphic } = this.imports;
            const { Polyline } = this.imports;
            const { geometryEngine } = this.imports;

            const sRelationID = oGraphicInfo.getAttribute("relationID");
            const oGeometry = oGraphicInfo.geometry;
            const oView = this.getView();
            const n0 = 0, n10 = 10;

            if (oGeometry) {

                const aDistanceInfo = this.getGeometryDistanceInfo(oGeometry, bAllDistances, bCompleted);

                if (bAllDistances) {
                    // Make sure there are no duplicated distances on the map
                    this.clearGeometryDistanceForGraphic(sRelationID);
                }

                aDistanceInfo.forEach((oDistanceInfo) => {

                    const nDistance = geometryEngine.distance(oDistanceInfo.point1, oDistanceInfo.point2, "meters");

                    if (nDistance > n0) {
                        const sDistance = `${Math.round(nDistance * n10) / n10}m`;

                        const oDistanceLine = new Polyline({
                            paths: oDistanceInfo.path,
                            spatialReference: oView.spatialReference
                        });

                        const oDistanceGraphic = new Graphic({
                            geometry: oDistanceLine.extent.center,
                            attributes: {
                                relationID: sRelationID // used as relation to graphic geometry
                            },
                            symbol: this.getGeometryTextSymbol(sDistance)
                        });

                        this.getLayer(sLayerID).graphics.add(oDistanceGraphic);
                    }
                });
            }
        },

        processGeometryAcreage: function(sLayerID, oGraphicInfo) {
            const { Graphic } = this.imports;
            const { geometryEngine } = this.imports;

            const sRelationID = oGraphicInfo.getAttribute("relationID");
            const oGeometry = oGraphicInfo.geometry;
            const n100 = 100;

            if (oGeometry.type === "polygon") {
                const nAcreage = geometryEngine.planarArea(oGeometry, "square-meters");
                const sAcreage = `${Math.round(nAcreage * n100) / n100}m2`;
                const oAcreageGraphic = new Graphic({
                    geometry: oGeometry.extent.center,
                    attributes: {
                        relationID: sRelationID // used as relation to graphic geometry
                    },
                    symbol: this.getGeometryTextSymbol(sAcreage)
                });

                this.getLayer(sLayerID).graphics.add(oAcreageGraphic);

                return nAcreage;
            }
        },

        getGeometryDistanceInfo: function(oGeometry, bAllDistances, bCompleted) {
            const { Point } = this.imports;

            const n0 = 0, n1 = 1, n2 = 2;
            const oView = this.getView();

            if (oGeometry.type === "polygon") {

                if (bAllDistances) {
                    const aDistanceInfo = [];

                    oGeometry.rings.forEach((aRings) => {
                        for (let nIndex = n1; nIndex < aRings.length; nIndex++) {
                            const aPoint1 = aRings[nIndex];
                            const oPoint1 = new Point({ x: aPoint1[n0], y: aPoint1[n1], spatialReference: oView.spatialReference });

                            const aPoint2 = aRings[nIndex - n1];
                            const oPoint2 = new Point({ x: aPoint2[n0], y: aPoint2[n1], spatialReference: oView.spatialReference });

                            aDistanceInfo.push({
                                point1: oPoint1,
                                point2: oPoint2,
                                path: [[aPoint1, aPoint2]]
                            });
                        }
                    });

                    return aDistanceInfo;

                } else {

                    // Initial the array contains 2 items: first click coordinates and the mouse move coordinates
                    // We only have to add the distance label when there are 2 coordinates points clicked in the map

                    const aRings = oGeometry.rings[n0];
                    const nMaxIndex = aRings.length - n2;

                    if (nMaxIndex > n0) {
                        const aPoint1 = aRings[nMaxIndex];
                        const oPoint1 = new Point({ x: aPoint1[n0], y: aPoint1[n1], spatialReference: oView.spatialReference });

                        const aPoint2 = aRings[bCompleted ? n0 : (nMaxIndex - n1)];
                        const oPoint2 = new Point({ x: aPoint2[n0], y: aPoint2[n1], spatialReference: oView.spatialReference });

                        return [{
                            point1: oPoint1,
                            point2: oPoint2,
                            path: [[aPoint1, aPoint2]]
                        }];
                    }
                }
            }

            // When needed... : "polyline", "rectangle", "circel"

            return [];
        },

        clearGeometryDistanceLive: function() {
            this.getLayer("GEOM_DISTANCE_LIVE_LAYER").removeAll();
        },

        clearGeometryDistanceForGraphic: function(sRelationID) {
            if (sRelationID) {
                const oLayer = this.getLayer("GEOM_DISTANCE_RESULT_LAYER");
                const aGraphicItems = oLayer.graphics.items;
                const aRelationItems = aGraphicItems.filter((oItem) => oItem.getAttribute("relationID") === sRelationID);

                oLayer.removeMany(aRelationItems);
            }
        },

        subscribeGeometryCreated: function(fnCallback) {
            this.fnPublishGeometryCreated = fnCallback;
        },

        subscribeGeometryUpdated: function(fnCallback) {
            this.fnPublishGeometryUpdated = fnCallback;
        },

        subscribeGeometryDeleted: function(fnCallback) {
            this.fnPublishGeometryDeleted = fnCallback;
        },

        setGeometryReferenceID: function(oGraphic, sReferenceID) {
            oGraphic.setAttribute("referenceID", sReferenceID);
        },

        addGeometriesToMap: function(aData, fnCallback) { // aData = [ { geometry : string, referenceID : string }]
            this.addGeometryLayer();
            const oGeometryLayer = this.getLayer("GEOM_LAYER");
            const n0 = 0;

            const aGraphics = aData.map((oData) => {

                // Check if geometry equal NULL
                if (!oData.geometry) {
                    return null;
                }

                // Check geometry already exist in layer
                const aGraphics = oGeometryLayer.graphics.items.filter((oItem) => oItem.attributes.referenceID === oData.referenceID);

                if (aGraphics.length > n0) {
                    oLog.error(`EsriApi | addGeometriesToMap() | Geometry with referenceID ${oData.referenceID} already exist in layer GEOM_LAYER.`);

                    return aGraphics[n0];
                }

                // Otherwise add geometry to layer
                const oGraphicItem = this.getGeometryGraphic(oData.geometry);

                if (oGraphicItem) {
                    oGraphicItem.setAttribute("relationID", createGuid());
                    this.setGeometryReferenceID(oGraphicItem, oData.referenceID);

                    oGeometryLayer.graphics.add(oGraphicItem);

                    return oGraphicItem;
                }

                return null;

            }).filter((oItem) => oItem);

            fnCallback(aGraphics);
        },

        removeGeometriesFromMap: function() {
            this.getLayer("GEOM_LAYER")?.removeAll();
            this.getLayer("GEOM_DISTANCE_RESULT_LAYER")?.removeAll();
            this.getLayer("GEOM_DISTANCE_LIVE_LAYER")?.removeAll();
        },

        getGeometryGraphic: function(sGeometry, fnCallbackSymbol) {
            const { Graphic } = this.imports;

            const oGeometry = typeof (sGeometry) === "object" ? sGeometry : JSON.parse(sGeometry);
            const oView = this.getView();

            if (oGeometry.type === "polygon" || oGeometry.rings) {

                return new Graphic({
                    geometry: {
                        type: "polygon",
                        rings: oGeometry.rings,
                        spatialReference: oView.spatialReference
                    },
                    symbol: fnCallbackSymbol ? fnCallbackSymbol() : this.getGeometryPolygonSymbol()
                });

            } else if (oGeometry.type === "point" || (oGeometry.x && oGeometry.y)) {

                return new Graphic({
                    geometry: {
                        type: "point",
                        x: oGeometry.x,
                        y: oGeometry.y,
                        spatialReference: oView.spatialReference
                    },
                    symbol: fnCallbackSymbol ? fnCallbackSymbol() : this.getGeometryPointSymbol()
                });
            }

            return null;
        },

        calcGeometryDistances: function(aGraphics) {
            aGraphics.forEach((oGraphic) => {
                this.processGeometryDistances("GEOM_DISTANCE_RESULT_LAYER", oGraphic, true, true);
                this.processGeometryAcreage("GEOM_DISTANCE_RESULT_LAYER", oGraphic);
            });
        },

        getGeometryTextSymbol: function(sText) {
            const n10 = 10, n255 = 255, n127 = 127, n0 = 0, n3 = 3;

            return {
                type: "text", color: [n255, n127, n0], haloColor: "white", haloSize: "20px",
                text: sText, xoffset: n3, yoffset: n3, font: { size: n10, family: "sans-serif" }
            };
        },

        getGeometryPolygonSymbol: function() {
            const n150 = 150, n02 = 0.2, n50 = 50, n1 = 1, n2 = 2;

            return {
                type: "simple-fill", color: [n150, n150, n150, n02], style: "solid",
                outline: { color: [n50, n50, n50, n1], join: "round", cap: "round", miterLimit: n2, style: "solid", width: n2 }
            };
        },

        getGeometryPointSymbol: function() {
            const n6 = 6, n255 = 255, n1 = 1, n50 = 50, n2 = 2;

            return {
                type: "simple-marker", color: [n255, n255, n255, n1], style: "circle", size: n6,
                outline: { type: "simple-line", color: [n50, n50, n50, n1], join: "round", cap: "round", miterLimit: n2, style: "solid", width: n1 }
            };
        },

        /**
         * MEASURE
         */
        addMeasureButton: async function() {
            const { Measurement } = this.imports;
            const { Expand } = this.imports;
            const { domconstruct } = this.imports;

            try {
                const sMeasureHtml = await this.loadHtml("EsriMeasureButton");

                const oView = this.getView();
                const oMeasureWidget = new Measurement();

                oMeasureWidget.view = oView;
                oView.ui.add(oMeasureWidget, "bottom-right");

                const oMeasureHtml = domconstruct.create("div", { innerHTML: sMeasureHtml });
                const oExpandButton = new Expand({
                    view: oView,
                    content: oMeasureHtml,
                    expandIconClass: "esri-icon-measure",
                    group: "top-right"
                });

                oView.ui.add(oExpandButton, "top-right");

                this.setMeasureButtonEventHandlers(oMeasureWidget);
                this.setWidgetButton("MEASURE", oExpandButton);

            } catch (oError) {
                oLog.error('EsriApi | loadHtml("EsriMeasureButton") | Unexpected failure while loading html for measure buttons.');
                oLog.error(oError);
                this.throwUnexpectedFailure(oError);
            }
        },

        setMeasureButtonEventHandlers: async function(oMeasureWidget) {
            try {
                await this.checkEsriHtmlLoaded("EsriMeasureButtonGroup");

                const oDistanceBtn = this.getButtonElementById("EsriMeasureDistanceButton");
                const oAreaBtn = this.getButtonElementById("EsriMeasureAreaButton");
                const oClearBtn = this.getButtonElementById("EsriMeasureClearButton");

                oDistanceBtn?.addEventListener("click", () => this.activateMeasureDistance(oMeasureWidget, oDistanceBtn, oAreaBtn));
                oAreaBtn?.addEventListener("click", () => this.activateMeasureArea(oMeasureWidget, oDistanceBtn, oAreaBtn));
                oClearBtn?.addEventListener("click", () => this.activateMeasureClear(oMeasureWidget, oDistanceBtn, oAreaBtn));

            } catch (oError) {
                oLog.error("EsriApi | setMeasureButtonEventHandlers() | Unexpected failure while check html for measure buttons loaded.");
                oLog.error(oError);
                this.throwUnexpectedFailure(oError);
            }
        },

        activateMeasureDistance: function(oMeasureWidget, oDistanceBtn, oAreaBtn) {
            const sViewType = this.getView().type;

            oMeasureWidget.activeTool = (sViewType.toUpperCase() === "2D" ? "distance" : "direct-line");
            oDistanceBtn.classList.add("active");
            oAreaBtn.classList.remove("active");

            this.setMeasureActive(true); // in order to disable click event on layer
            this.clearHighlighted();
        },

        activateMeasureArea: function(oMeasureWidget, oDistanceBtn, oAreaBtn) {
            oMeasureWidget.activeTool = "area";
            oDistanceBtn.classList.remove("active");
            oAreaBtn.classList.add("active");

            this.setMeasureActive(true); // in order to disable click event on layer
            this.clearHighlighted();
        },

        activateMeasureClear: function(oMeasureWidget, oDistanceBtn, oAreaBtn) {
            oMeasureWidget.clear();
            oDistanceBtn.classList.remove("active");
            oAreaBtn.classList.remove("active");

            this.setMeasureActive(false); // in order to enable click event on layer
            this.clearHighlighted();
        },

        /**
         * XY COORDINATES
         */
        addXyButton: function() {
            const { CoordinateConversion } = this.imports;

            const oView = this.getView();
            const oWidget = new CoordinateConversion({
                view: oView,
                visibleElements: {
                    settingsButton: false,
                    captureButton: false
                }
            });

            oView.ui.add(oWidget, "bottom-right");
            this.setWidgetButton("XY", oWidget);
        },

        /**
         * INFO
         */
        addInfoButton: function() {
            // TODO
        },

        /**
         * HIGHLIGHT
         */
        highlightFeatures: async function(sLayerId, aFeatures, bRemoveHighlightsFirst) {
            if (bRemoveHighlightsFirst) {
                this.clearHighlighted();
            }

            const oView = this.getView();
            const oEsriLayer = this.getLayer(sLayerId);
            const oLayerView = await oView.whenLayerView(oEsriLayer);

            aFeatures.forEach((oFeature) => {
                const oHighlight = oLayerView.highlight(oFeature);

                this.setHighlightedObject(sLayerId, oFeature, oHighlight);
            });
        },

        highlightGeometry: async function(sReferenceID, bRemoveHighlightsFirst) {
            if (bRemoveHighlightsFirst) {
                this.clearHighlighted();
            }

            const oLayer = this.getLayer("GEOM_LAYER");

            if (oLayer) {
                const oLayerView = await this.getView().whenLayerView(oLayer);
                const aGraphics = oLayer.graphics.items.filter((oItem) => oItem.getAttribute("referenceID") === sReferenceID);

                aGraphics.forEach((oGraphic) => {
                    const oHighlight = oLayerView.highlight(oGraphic);

                    this.setHighlightedObject("GEOM_LAYER", oGraphic, oHighlight);
                });
            }
        },

        highlightGraphics: async function(sLayerId, aGraphics, bRemoveHighlightsFirst) {
            if (bRemoveHighlightsFirst) {
                this.clearHighlighted();
            }

            const oLayer = this.getLayer(sLayerId);

            if (oLayer) {
                const oLayerView = await this.getView().whenLayerView(oLayer);

                aGraphics.forEach((oGraphic) => {
                    const oHighlight = oLayerView.highlight(oGraphic);

                    this.setHighlightedObject(sLayerId, oGraphic, oHighlight);
                });
            }
        },

        clearHighlighted: function() {
            const aFeatures = this.allHighlightedObjects();

            aFeatures.forEach((oItem) => oItem.highlight.remove());
            this.clearHighlightedObjects();
        },

        /**
         * QUERY FEATURES
         */
        queryDataFromLayer: async function(sLayerId, oLayerView, fnCallback) {
            try {
                if (!oLayerView.suspended && oLayerView.visible) {
                    const oView = this.getView();
                    const oResult = await oLayerView.queryFeatures({
                        geometry: oView.extent,
                        returnGeometry: true
                    });
                    const aFeatures = oResult.features;
                    const aFeatureData = aFeatures.map((oFeature) => ({ feature: oFeature, attributes: oFeature.attributes }));

                    fnCallback(sLayerId, aFeatureData);

                } else {
                    fnCallback(sLayerId, []); // clear data from application
                }
            } catch (oError) {
                oLog.error(`EsriApi | queryDataFromLayer() | Unexpected failure while query data for layer ${sLayerId}.`);
                oLog.error(oError);
                this.throwUnexpectedFailure(oError);
            }
        },

        createQueryWhereFromFilter: function(aFilters) {
            const n0 = 0;

            if (aFilters && aFilters.length > n0) {
                const aTmpAnd = aFilters.filter((oItem) => oItem.and);
                const sAND = aTmpAnd.reduce((sWhere, oFilter) => {
                    const sValue = this.getQueryFromFilterValue(oFilter);

                    sWhere += (sWhere.length === n0 ? "" : " AND ") + (oFilter.id + sValue);

                    return sWhere;
                }, "");

                const aOR = [];
                const aTmpOR = aFilters.filter((oItem) => !oItem.and).reduce((oResponse, oItem) => {
                    if (!oResponse[oItem.id]) {
                        oResponse[oItem.id] = new Array();
                    }

                    oResponse[oItem.id].push(`'${oItem.value}'`);

                    return oResponse;
                }, {});

                for (const sId in aTmpOR) {
                    if (Object.hasOwnProperty.call(aTmpOR, sId)) {
                        const sValues = aTmpOR[sId].join(",");

                        aOR.push(`${sId} IN (${sValues})`);
                    }
                }

                const sOR = aOR.join(" OR ");
                const sWhere = (sAND.length > n0 && sOR.length > n0) ? `(${sOR}) AND ${sAND}` : (sAND || sOR);

                return sWhere;
            }

            return "";
        },

        getQueryFromFilterValue: function(oFilter) {
            switch (oFilter.operator?.toUpperCase()) {
            case "CONTAINS":
            case "CA":
                return ` Like '%${oFilter.value}%'`;
            default:
                return ` = '${oFilter.value}'`;
            }
        },

        /**
         * EVENT HANDLERS
         */
        activateGetDataFromMapExtent: function(aLayerIds, fnCallback) {
            aLayerIds.forEach((sLayerId) => {
                this.activateDataWatchForLayer(sLayerId, fnCallback);
            });
        },

        activateDataWatchForLayer: async function(sLayerId, fnCallback) {
            try {
                const oView = this.getView();
                const oEsriLayer = this.getLayer(sLayerId);
                const oLayerView = await oView.whenLayerView(oEsriLayer);

                oLayerView.watch("updating", (bLoading) => {
                    if (!bLoading) {
                        this.queryDataFromLayer(sLayerId, oLayerView, fnCallback);
                    }
                });
                oLayerView.watch("visible", (bVisible) => {
                    if (!bVisible) {
                        fnCallback(sLayerId, []); // clear data from application
                    }
                });
                oLayerView.watch("suspended", (bSuspend) => {
                    if (bSuspend) {
                        fnCallback(sLayerId, []); // clear data from application
                    }
                });
            } catch (oError) {
                oLog.error(`EsriApi | activateWatchForLayer() | Unexpected failure while set event watch for layer ${sLayerId}.`);
                oLog.error(oError);
                this.throwUnexpectedFailure(oError);
            }
        },

        addLayerEventHandler: function(sEventType, aLayerIds, fnCallback) {
            // sEventType = click, double-click, hover, ...
            aLayerIds.forEach((sLayerId) => {
                this.setLayerEventCallback(sLayerId, sEventType, fnCallback);
            });
            this.getView().on(sEventType, (oEvent) => {
                this.handleLayerEvent(oEvent);
            });
        },

        handleLayerEvent: async function(oEvent) {
            try {
                if (this.checkLayerEventIsEnabled()) {
                    const oResponse = await this.getView().hitTest(oEvent);
                    const aResults = oResponse.results;

                    // Create object with layerId property and value [feature, attribute]
                    const oLayerData = aResults.reduce((oAcc, oCurr) => {
                        const oLayer = oCurr.graphic.layer;
                        const sLayerId = oLayer.id;

                        if (oLayer.visible) {
                            if (!oAcc[sLayerId]) {
                                oAcc[sLayerId] = [];
                            }

                            oAcc[sLayerId].push({
                                feature: oCurr.graphic,
                                attributes: oCurr.graphic.attributes
                            });
                        }

                        return oAcc;
                    }, {});

                    this.handleLayerEventCallback(oEvent, oLayerData);
                }
            } catch (oError) {
                // MG > Do nothing, sometimes ESRI throws an exception from the hittest
                // oLog.error("EsriApi | handleLayerEvent() | Unexpected failure while retrieve hittest from view.");
                // oLog.error(oError);
                // this.throwUnexpectedFailure(oError);
            }
        },

        handleLayerEventCallback: function(oEvent, oLayerData) {
            for (const sLayerId in oLayerData) {
                if (Object.hasOwnProperty.call(oLayerData, sLayerId)) {
                    const fnLayerEventCallback = this.getLayerEventCallback(sLayerId, oEvent.type);

                    if (fnLayerEventCallback) {
                        const oLayerConfig = this.getLayerConfigForId(sLayerId);

                        fnLayerEventCallback(sLayerId, oLayerData[sLayerId], oLayerConfig);
                    }
                }
            }
        },

        checkLayerEventIsEnabled: function() {
            return !this.isDrawActive() && !this.isMeasureActive();
        },

        /**
         * WIDGET
         */
        enableHomeWidget: function(bEnable) {
            this.enableWidgetButton("HOME", bEnable);
        },
        enableLocationWidget: function(bEnable) {
            this.enableWidgetButton("LOCATION", bEnable);
        },
        enableBaseLayerWidget: function(bEnable) {
            this.enableWidgetButton("BASELAYER", bEnable);
        },
        enableLayerWidget: function(bEnable) {
            this.enableWidgetButton("LAYER", bEnable);
        },

        enableDrawWidget: function(bEnable) {
            this.enableWidgetButton("DRAW", bEnable);

            // Make sure the geometries can't be selected and therefore edit
            const oWidget = this.getWidgetButton("DRAW").content;

            oWidget.defaultUpdateOptions.tool = bEnable ? "transform" : null;
        },

        enableMeasureWidget: function(bEnable) {
            this.enableWidgetButton("MEASURE", bEnable);
        },
        enableXyWidget: function(bEnable) {
            this.enableWidgetButton("XY", bEnable);
        },

        enableWidgetButton: function(sID, bEnable) {
            this.getWidgetButton(sID).visible = bEnable;
        },
        setWidgetButton: function(sID, oButton) {
            this.oExpandButtons[sID] = oButton;
        },
        getWidgetButton: function(sID) {
            return this.oExpandButtons[sID];
        },

        /**
         * SUPPORT ATTRIBUTES AND FUNCTIONS
         */
        fnUnexpectedFailure: (oError) => oError /* override by constructor initReferences() */,
        throwUnexpectedFailure: function(oError) {
            this.fnUnexpectedFailure(oError);
        },

        getInstanceId: function() {
            return this.sId;
        },
        getInstanceElementId: function(sId) {
            return `instance-${this.getInstanceId()}-${sId}`;
        },
        getInstanceDivId: function(sId) {
            return `${this.getInstanceElementId(sId)}Div`;
        },

        getDocumentElementById: function(sId) {
            return document.getElementById(sId);
        },
        getButtonElementById: function(sId) {
            return this.getDocumentElementById(this.getInstanceElementId(sId));
        },

        setMap: function(oMap) {
            this.oReference.map = oMap;
        },
        getMap: function() {
            return this.oReference.map;
        },
        setView: function(oView) {
            this.oReference.view = oView;
        },
        getView: function() {
            return this.oReference.view;
        },
        setHome: function(oHome) {
            this.oReference.home = oHome;
        },
        getHome: function() {
            return this.oReference.home;
        },

        getConfiguration: function() {
            return this.oReference.config;
        },
        getBaseLayerConfig: function() {
            return this.getConfiguration().baselayers;
        },
        getLayerConfig: function() {
            return this.getConfiguration().layers;
        },
        getLayerConfigForId: function(sLayerId) {
            const aLayers = this.getConfiguration().layers;
            const aFiltered = aLayers.filter((oLayer) => oLayer.layerID === sLayerId);

            return aFiltered[0] || {};
        },

        // Support functions for layers
        setLayer: function(sId, oLayer, sType) {
            this.oLayers[sId] = { layer: oLayer, type: sType };
        },
        getLayer: function(sId) {
            return this.oLayers[sId]?.layer;
        },
        getLayersForType: function(sType) {
            let aLayers = [];

            for (const sId in this.oLayers) {
                if (Object.prototype.hasOwnProperty.call(this.oLayers, sId)) {
                    const oLayer = this.oLayers[sId];

                    if (oLayer.type === sType) {
                        aLayers = [...aLayers, oLayer.layer];
                    }
                }
            }

            return aLayers;
        },

        // Support functions for draw
        setDrawActive: function(bActive) {
            this.bDrawActive = bActive;
        },
        isDrawActive: function() {
            return this.bDrawActive;
        },

        // Support functions for measurements
        setMeasureActive: function(bActive) {
            this.bMeasureActive = bActive;
        },
        isMeasureActive: function() {
            return this.bMeasureActive;
        },

        // Support functions for highlight features
        setHighlightedObject: function(sLayerId, oFeature, oHighlight) {
            this.aHighlightedObjects.push({ layerID: sLayerId, feature: oFeature, highlight: oHighlight });
        },
        allHighlightedObjects: function() {
            return this.aHighlightedObjects;
        },
        clearHighlightedObjects: function() {
            this.aHighlightedObjects = [];
        },

        // Support functions for event handlers
        setLayerEventCallback: function(sLayerId, sEventType, fnCallback) {
            this.oLayerEventCallbacks[`${sLayerId}-${sEventType}`] = fnCallback;
        },
        getLayerEventCallback: function(sLayerId, sEventType) {
            return this.oLayerEventCallbacks[`${sLayerId}-${sEventType}`];
        },

        /**
         * HTML SUPPORT
         */
        loadHtml: async function(sFilename) {
            const oDeferred = $.Deferred();

            try {
                const sHtml = `<div id="{id}-EsriDiv" class="calcite claro guEsriDiv"><div id="{id}-EsriMap" class="guEsriMap"></div></div>`;
                const sFormatHtml = this.formatEsriHtmlWithInstanceId(sHtml);

                oDeferred.resolve(sFormatHtml);
            } catch (oError) {
                oDeferred.reject(oError);
            }

            return oDeferred.promise();
        },

        formatEsriHtmlWithInstanceId: function(sHtml) {
            return sHtml.replace(new RegExp("{id}", "g"), `instance-${this.getInstanceId()}`);
        },

        checkEsriHtmlLoaded: function(sId) {
            const oDeferred = $.Deferred(), nMax = 5, nWait = 500;
            let oInterval = null, iCount = 0;

            oInterval = setInterval(() => {
                const bLoaded = (document.getElementById(this.getInstanceElementId(sId)) !== null);

                if (bLoaded) {
                    clearInterval(oInterval);
                    oDeferred.resolve("LOADED");
                } else if (iCount > nMax) {
                    clearInterval(oInterval);
                    oDeferred.reject("NOTLOADED");
                }

                iCount++;
            }, nWait);

            return oDeferred.promise();
        },

        /**
         * LOAD IMPORTS
         */
        imports: {},
        /* istanbul ignore next */
        loadImports: function() {
            const oDeferred = $.Deferred();

            require([
                "esri/WebMap",
                "esri/views/MapView",
                "esri/widgets/ScaleBar",
                "esri/geometry/geometryEngine",
                "esri/Basemap",
                "esri/geometry/Extent",
                "esri/widgets/Expand",
                "esri/layers/FeatureLayer",
                "esri/layers/MapImageLayer",
                "esri/layers/VectorTileLayer",
                "esri/layers/GraphicsLayer",
                "esri/Graphic",
                "esri/geometry/Point",
                "esri/geometry/Polyline",
                "esri/widgets/Home",
                "esri/Viewpoint",
                "esri/widgets/Track",
                "esri/widgets/LayerList",
                "esri/widgets/BasemapGallery",
                "esri/widgets/Sketch",
                "esri/widgets/Measurement",
                "dojo/dom-construct",
                "esri/widgets/CoordinateConversion",
                "esri/rest/support/Query"

            ], (oWebMap, oMapView, oScaleBar, oGeometryEngine, oBasemap, oExtent, oExpand,
                oFeatureLayer, oMapImageLayer, oVectorTileLayer, oGraphicsLayer,
                oGraphic, oPoint, oPolyline,
                oHome, oViewpoint, oTrack, oLayerList, oBasemapGallery, oSketch, oMeasurement, oDomConstruct, oCoordinateConversion,
                oQuery
            ) => {

                this.imports = {
                    WebMap: oWebMap,
                    MapView: oMapView,
                    ScaleBar: oScaleBar,
                    geometryEngine: oGeometryEngine,
                    Basemap: oBasemap,
                    Extent: oExtent,
                    Expand: oExpand,
                    FeatureLayer: oFeatureLayer,
                    MapImageLayer: oMapImageLayer,
                    VectorTileLayer: oVectorTileLayer,
                    GraphicsLayer: oGraphicsLayer,
                    Graphic: oGraphic,
                    Point: oPoint,
                    Polyline: oPolyline,
                    Home: oHome,
                    Viewpoint: oViewpoint,
                    Track: oTrack,
                    LayerList: oLayerList,
                    BasemapGallery: oBasemapGallery,
                    Sketch: oSketch,
                    Measurement: oMeasurement,
                    domconstruct: oDomConstruct,
                    CoordinateConversion: oCoordinateConversion,
                    Query: oQuery
                };
                oDeferred.resolve();
            });

            return oDeferred.promise();
        },

        /**
         * SPECIFIC FROM GZ APPLICATIONS
         */
        addDamageReferenceLayer: function(sLayerID, sLayerTitle) {
            const { GraphicsLayer } = this.imports;
            const sDamageReferenceLayerID = `DAMAGE_REFERENCE_${sLayerID}_LAYER`;
            let oDamageReferenceLayer = this.getLayer(sDamageReferenceLayerID);
            const n0 = 0, n25000 = 25000;

            if (oDamageReferenceLayer) {
                oDamageReferenceLayer.listMode = "show";

                return;
            }

            oDamageReferenceLayer = new GraphicsLayer({
                id: sDamageReferenceLayerID,
                title: sLayerTitle,
                listMode: "show",
                minScale: n25000,
                maxScale: n0
            });

            this.setLayer(sDamageReferenceLayerID, oDamageReferenceLayer, "DAMAGEREFERENCE");

            this.getMap().add(oDamageReferenceLayer, n0); // On lowest level layer
        },

        addDamageReferenceGeometryToLayer: function(sLayerID, sReferenceID, sGeometry) {
            const sDamageReferenceLayerID = `DAMAGE_REFERENCE_${sLayerID}_LAYER`;
            const oDamageReferenceLayer = this.getLayer(sDamageReferenceLayerID);
            const n0 = 0, n1 = 1;

            if (oDamageReferenceLayer) {

                // Check if reference geometry already exist
                const aGraphics = oDamageReferenceLayer.graphics.items.filter((oItem) => oItem.attributes.referenceID === sReferenceID);

                if (aGraphics.length === n1) {
                    return aGraphics[n0];
                }

                // Otherwise, add reference geometry
                const oGeometry = typeof (sGeometry) === "object" ? sGeometry : JSON.parse(sGeometry);

                const oGraphicItem = this.getGeometryGraphic(oGeometry, this.getDamageReferenceGeometryPolygonSymbol);

                if (oGraphicItem) {
                    oGraphicItem.setAttribute("referenceID", sReferenceID);
                    this.setGeometryReferenceID(oGraphicItem, sReferenceID);

                    oDamageReferenceLayer.graphics.add(oGraphicItem);

                    return oGraphicItem;
                }

                return null;

            } else {
                oLog.error(`EsriApi | addDamageReferenceGeometryToLayer() | Layer ${sDamageReferenceLayerID} not found, addDamageReferenceLayer() first.`);
            }
        },

        getDamageReferenceGeometryPolygonSymbol: function() {
            const n255 = 255, n150 = 150, n05 = 0.5, n02 = 0.2, n50 = 50, n2 = 2;

            return {
                type: "simple-fill", color: [n255, n150, n255, n02], style: "solid",
                outline: { color: [n50, n50, n50, n05], join: "round", cap: "round", miterLimit: n2, style: "solid", width: n2 }
            };
        },

        resetDamageReferenceLayer: function() {
            this.getLayersForType("DAMAGEREFERENCE").forEach((oLayer) => {
                oLayer.removeAll();
                oLayer.listMode = "hide";
            });
        },

        highlightDamageReferenceGraphic: async function(sLayerID, aGraphics, bRemoveHighlightsFirst) {
            await this.highlightGraphics(`DAMAGE_REFERENCE_${sLayerID}_LAYER`, aGraphics, bRemoveHighlightsFirst);
        },

        generateDamageGeometryFromReference: async function(sLayerID, sReferenceID) {
            const oDeferred = $.Deferred();
            const n0 = 0, n1 = 1;

            const sDamageReferenceLayerID = `DAMAGE_REFERENCE_${sLayerID}_LAYER`;
            const oDamageReferenceLayer = this.getLayer(sDamageReferenceLayerID);

            // Check if reference layer already exist
            if (!oDamageReferenceLayer) {
                oLog.error(`EsriApi | generateDamageGeometryFromReference() | Layer ${sDamageReferenceLayerID} not found. ` +
                    "AddDamageReferenceLayer() and addDamageReferenceGeometryToLayer() first.");

                oDeferred.reject({ errorCode: "FAILED_GENERATE_GEOMETRY_NO_DAMAGE_REFERENCE_LAYER" });

                return oDeferred.promise();
            }

            // Get reference geometry from layer
            const aDamageReferenceGraphics = oDamageReferenceLayer.graphics.items.filter(
                (oGraphic) => oGraphic.attributes.referenceID === sReferenceID
            );

            // Check if reference geometry exist (crop or cadastral parcel)
            if (aDamageReferenceGraphics.length === n0) {
                oLog.error("EsriApi | generateDamageGeometryFromReference() | FAILED_GENERATE_GEOMETRY_NO_DAMAGE_REFERENCES. Unable to generate geometry.");
                oDeferred.reject({ errorCode: "FAILED_GENERATE_GEOMETRY_NO_DAMAGE_REFERENCES" });

            } else if (aDamageReferenceGraphics.length === n1) {
                const oDamageReferenceGraphic = aDamageReferenceGraphics[n0];

                const oGeometryData = await this.generateDamageGeometry(oDamageReferenceGraphic.geometry, oDamageReferenceGraphic.attributes);

                if (oGeometryData && oGeometryData.details?.geometry) {
                    oDeferred.resolve(oGeometryData);

                } else {
                    oLog.error("EsriApi | generateDamageGeometryFromReference() | FAILED_GENERATE_GEOMETRY_ISNULL. References found:");
                    oLog.error(JSON.stringify(aDamageReferenceGraphics));
                    oDeferred.reject({
                        errorCode: "FAILED_GENERATE_GEOMETRY_ISNULL", // Possible cause: no damagezones set...
                        references: aDamageReferenceGraphics
                    });
                }

            } else {
                oLog.error("EsriApi | generateDamageGeometryFromReference() | FAILED_GENERATE_GEOMETRY_MULTIPLE_DAMAGE_REFERENCES. References found:");
                oLog.error(JSON.stringify(aDamageReferenceGraphics));
                oDeferred.reject({
                    errorCode: "FAILED_GENERATE_GEOMETRY_MULTIPLE_DAMAGE_REFERENCES",
                    references: aDamageReferenceGraphics
                });
            }

            return oDeferred.promise();
        },

        // oReferenceGeometryData : Object { feature : {attributes, geometry, ... }, attributes : object }
        generateDamageGeometry: async function(oGeometry, oAttributes) {
            const { Query } = this.imports;
            const { geometryEngine } = this.imports;
            const n0 = 0;

            // Get damage zones (features)
            const oDamageZoneLayer = this.getLayer("DAMAGEZONES");
            const oReferenceGeometry = oGeometry;

            const oQuery = new Query();

            oQuery.where = "1=1";
            oQuery.geometry = oReferenceGeometry;
            oQuery.spatialRelationship = "intersects";
            oQuery.outSpatialReference = { wkid: 28992 };
            oQuery.returnGeometry = true;
            oQuery.outFields = ["*"];

            const oResponse = await oDamageZoneLayer.queryFeatures(oQuery);
            const aDamageZoneFeatures = oResponse.features;

            // Return nothing when no damagezones are available, in this case no damage geometry can be generated
            if (!aDamageZoneFeatures || aDamageZoneFeatures.length === n0) {
                oLog.error("EsriApi | generateDamageGeometry() | No damagezones available.");

                // Retrieve metadata e.g. assets, areas and cadastral parcels
                const aAssets = await this.getGeometryIntersectDataForLayer("PIPELINE", oReferenceGeometry);
                const aAreas = await this.getGeometryIntersectDataForLayer("AREAS", oReferenceGeometry);
                const aCadastral = await this.getGeometryIntersectDataForLayer("KADASTER", oReferenceGeometry);

                return {
                    details: {
                        geometry: null,
                        acreage: 0
                    },
                    metadata: {
                        damageReference: this.formatDamageReference(oAttributes, oReferenceGeometry),
                        cadastralParcels: this.formatCadastralParcelData(aCadastral),
                        assets: this.formatAssetData(aAssets),
                        areas: this.formatAreaData(aAreas)
                    }
                };
            }

            // Intersect damagezone geometries with cropparcel geometry
            // Union to combine all geometries (polygons) in one geometry (multipolygon)
            // Calculate total acreage needed for notification item
            const aDamageZoneGeom = aDamageZoneFeatures.map((oFeature) => oFeature.geometry);
            const aDamageGeom = geometryEngine.intersect(aDamageZoneGeom, oReferenceGeometry);
            const oDamageGeom = geometryEngine.union(aDamageGeom);
            const sAcreage = geometryEngine.planarArea(oDamageGeom, "square-meters");

            // Retrieve metadata e.g. assets, areas and cadastral parcels
            const aAssets = await this.getGeometryIntersectDataForLayer("PIPELINE", oDamageGeom);
            const aAreas = await this.getGeometryIntersectDataForLayer("AREAS", oDamageGeom);
            const aCadastral = await this.getGeometryIntersectDataForLayer("KADASTER", oDamageGeom);

            // Return the formatted data to the application for further processing
            return {
                details: {
                    geometry: oDamageGeom,
                    acreage: sAcreage
                },
                metadata: {
                    damageReference: this.formatDamageReference(oAttributes, oGeometry),
                    cadastralParcels: this.formatCadastralParcelData(aCadastral),
                    assets: this.formatAssetData(aAssets),
                    areas: this.formatAreaData(aAreas)
                }
            };
        },

        getGeometryIntersectDataForLayer: async function(sLayerID, oGeometry) {
            const { Query } = this.imports;
            const oLayer = this.getLayer(sLayerID);

            if (oLayer) {
                const oQuery = new Query();

                oQuery.where = "1=1";
                oQuery.geometry = oGeometry;
                oQuery.spatialRelationship = "intersects";
                oQuery.outSpatialReference = { wkid: 28992 };
                oQuery.returnGeometry = true;
                oQuery.outFields = ["*"];

                const oResponse = await oLayer.queryFeatures(oQuery);

                const aData = oResponse.features.map((oFeature) => oFeature.attributes);

                return aData;

            } else {
                oLog.error(`EsriApi | getGeometryIntersectDataForLayer() | Layer not found for ${sLayerID}.`);
            }
        },

        formatDamageReference: function(oAttributes, oGeometry) {
            // Damage reference could be a:
            // 1. Public RVO (business users without EH)
            // 2. Cadastral parcel (private user)
            // 3. Private RVO (business users with EH)

            return oAttributes ? {
                objectID: oAttributes.OBJECTID || oAttributes.objectid,
                cropCategory: oAttributes.CAT_GEWASCATEGORIE || "",
                crop: oAttributes.GWS_GEWAS || "",
                cropCode: oAttributes.GWS_GEWASCODE || "",
                cadastralParcel: this.formatCadastralParcelCode(oAttributes.akrkadastralegemeentecode, oAttributes.sectie, oAttributes.perceelnummer),
                geometry: oGeometry
            } : {};
        },

        formatCadastralParcelData: function(aData) {
            return aData ? aData.map((oItem) => ({
                objectID: oItem.objectid,
                cadastralParcel: this.formatCadastralParcelCode(oItem.akrkadastralegemeentecode, oItem.sectie, oItem.perceelnummer),
                townCode: oItem.akrkadastralegemeentecode,
                townValue: oItem.kadastralegemeentewaarde,
                section: oItem.sectie,
                parcelNumber: oItem.perceelnummer
            })) : [];
        },

        formatCadastralParcelCode: function(sTownCode, sSection, sParcelNumber) {
            return (sTownCode && sSection && sParcelNumber) ?
                [sTownCode, sSection, sParcelNumber].join("-") : ""; // ZLK00-L-2538
        },

        formatAssetData: function(aData) {
            return aData ? aData.map((oItem) => ({
                objectID: oItem.OBJECTID,
                gisID: oItem.Identifier,
                asset: oItem.Leiding
            })) : [];
        },

        formatAreaData: function(aData) {
            return aData ? aData.map((oItem) => ({
                objectID: oItem.OBJECTID,
                gisID: oItem.Identifier,
                areaCode: oItem.GebiedCode
            })) : [];
        }

    };

    return EsriApi;

});