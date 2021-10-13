/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"nl/gasunie/poc/fiorimodule/test/integration/AllJourneys"
	], function () {
		QUnit.start();
	});
});
