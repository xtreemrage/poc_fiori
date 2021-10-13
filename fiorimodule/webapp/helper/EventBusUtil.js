sap.ui.define([
], () => {
    "use strict";

    const sChannelId = "pocgz.gasunie.nl";

    return {

        publish: (sEventId, oInstance, oData) => {
            const oEventBus = oInstance.getOwnerComponent()?.getEventBus();

            if (oEventBus && oEventBus.publish) {
                oEventBus.publish(sChannelId, sEventId, oData);
            }
        },

        subscribe: (sEventId, oInstance, fnCallback) => {
            const oEventBus = oInstance.getOwnerComponent()?.getEventBus();

            if (oEventBus && oEventBus.subscribe) {
                oEventBus.subscribe(sChannelId, sEventId, fnCallback, oInstance);
            }
        }
    };
});