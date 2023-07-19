export class uiParameters {
    static stateVariable = null;
    static aggregation = null;
    static daStage = null;
    static inflation = null;
    static showGaugeLocations = null;
    static timestamp = null;

    static linkID = null;
    static readFromGaugeLocation = null;

    static init(defaultParameters) {
        this.stateVariable = defaultParameters.stateVariable;
        this.aggregation = defaultParameters.aggregation;
        this.daStage = defaultParameters.daStage;
        this.inflation = defaultParameters.inflation;
        this.showGaugeLocations = defaultParameters.showGaugeLocations;
        this.timestamp = defaultParameters.timestamp;
    }

    static updateStateVariable(stateVariable) {
        this.stateVariable = stateVariable;
    }

    static updateAggregation(aggregation) {
        this.aggregation = aggregation;
    }

    static updateDaStage(daStage) {
        this.daStage = daStage;
    }

    static updateInflation(inflation) {
        this.inflation = inflation;
    }

    static updateShowGaugeLocations(showGaugeLocations) {
        this.showGaugeLocations = showGaugeLocations;
    }

    static updateTimestamp(timestamp) {
        this.timestamp = timestamp;
    }

    static updateLinkSelection(linkID, locationSrc, locationDst) {
        this.linkID = linkID;
        d3.select("#link-loc-text")
            .text(function() {
                var lon = (locationSrc[0] + locationDst[0]) / 2;
                var lat = (locationSrc[1] + locationDst[1]) / 2;
                lon = lon > 180 ? lon - 360 : (lon < -180 ? lon + 360 : lon);
                return `${linkID} at (${Math.round(lon * 100) / 100}, ${Math.round(lat * 100) / 100})`;
            })
    }

    static updateReadFromGaugeLocation(readFromGaugeLocation) {
        this.readFromGaugeLocation = readFromGaugeLocation;
    }
}