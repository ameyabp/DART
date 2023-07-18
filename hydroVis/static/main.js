import { drawGaugeLocations, setupBaseMap } from './baseMap.js';
import { setupDistributionPlots } from './distribution_plot.js';
import { getJSDateObjectFromTimestamp } from './helper.js';
import { setupHydrographPlots } from './hydrograph.js';
import { drawMapData } from './render.js';

class uiParameters {
    constructor(tooltip, path, projection) {
        this.tooltip = tooltip;
        this.path = path;
        this.projection = projection;
    }

    init(defaultParameters) {
        this.stateVariable = defaultParameters.stateVariable;
        this.timestamp = defaultParameters.timestamp;
        this.aggregation = defaultParameters.aggregation;
        this.daStage = defaultParameters.daStage;
        this.inflation = defaultParameters.inflation;

        this.render();
    }

    updateTimestamp(timestamp) {
        if (this.timestamp != timestamp) {
            this.timestamp = timestamp;
            this.render();
        }
    }

    updateAggregation(aggregation) {
        if (this.aggregation != aggregation) {
            this.aggregation = aggregation;
            this.render();
        }
    }

    updateDaStage(daStage) {
        if (this.daStage != daStage) {
            this.daStage = daStage;
            this.render();
        }
    }

    updateStateVariable(stateVariable) {
        if (this.stateVariable != stateVariable) {
            this.stateVariable = stateVariable;
            this.render();
        }
    }

    updateInflation(inflation) {
        if (this.inflation != inflation) {
            this.inflation = inflation;
            this.render();
        }
    }

    render() {
        drawMapData(this.tooltip, this.path, this.timestamp, this.aggregation, this.daStage, this.stateVariable, this.inflation);
    }
}

async function setupControlPanel(visParameters) {
    var defaultParameters = {};

    await d3.json('/getUIParameters',
    {
        method: 'GET',
        headers: {
            'Content-type': 'application/json; charset=UTF-8'
        }
    })
    .then(function(data) {
        // wire up stateVariable dropdown changes
        d3.select("#stateVariable-dropdown")
            .on("change", function() {
                visParameters.updateStateVariable(this.value);
            })
            .selectAll("option")
            .data(data.stateVariables)
            .enter()
                .append("option")
                .text(function(d) { return d; })
                .attr("value", function(d) { return d })
                .property("selected", function(d) {
                    return d === data.stateVariables[0];   // qlink1
                });
        defaultParameters['stateVariable'] = data.stateVariables[0];

        // wire up aggregation changes
        d3.selectAll("input[name='aggregation']")
            .on("change", function() {
                if (isNaN(this.value)) {    
                    // mean or stdev selected
                    d3.select("#member")
                        .property("value", '');

                    visParameters.updateAggregation(this.value);
                }
                else {
                    // individual ensemble member selected
                    d3.selectAll("input[name='aggregation']")
                        .property("checked", false);

                    visParameters.updateAggregation(+this.value);
                }
            });
        defaultParameters['aggregation'] = d3.selectAll("input[name='aggregation']")
                                            .nodes()
                                            .filter(function(d) {   
                                                return d.checked;
                                            })[0].value;

        // wire up timeslider
        data.timestamps = data.timestamps.map(getJSDateObjectFromTimestamp);

        const minTimestamp = d3.min(data.timestamps);
        defaultParameters['timestamp'] = `${minTimestamp.getFullYear()}${minTimestamp.getMonth() > 9 ? minTimestamp.getMonth() : '0'+minTimestamp.getMonth()}${minTimestamp.getDate() > 9 ? minTimestamp.getDate() : '0'+minTimestamp.getDate()}${minTimestamp.getHours() > 9 ? minTimestamp.getHours() : '0'+minTimestamp.getHours()}`;

        d3.select("#timestamp-display")
            .html(`${minTimestamp.getFullYear()}/${minTimestamp.getMonth() > 9 ? minTimestamp.getMonth() : '0'+minTimestamp.getMonth()}/${minTimestamp.getDate() > 9 ? minTimestamp.getDate() : '0'+minTimestamp.getDate()} : ${minTimestamp.getHours() > 9 ? minTimestamp.getHours() : '0'+minTimestamp.getHours()} Hrs`);

        const width = document.getElementById('timeSlider-div').clientWidth * 0.9;
        
        var sliderDiv = d3.select("#timeSlider-svg")
                        .attr("width", "100%")
                        .attr("height", "100%")
                        .append("g")
                        .attr("transform", `translate(50, 20)`)

        var slider = d3.sliderHorizontal()
                        .min(d3.min(data.timestamps))
                        .max(d3.max(data.timestamps))
                        .width(width)
                        .displayValue(false)
                        .default(minTimestamp)
                        .on('onchange', function(value) {
                            d3.select("#timestamp-display")
                                .html(`${value.getFullYear()}/${value.getMonth() > 9 ? value.getMonth() : '0'+value.getMonth()}/${value.getDate() > 9 ? value.getDate() : '0'+value.getDate()} : ${value.getHours() > 9 ? value.getHours() : '0'+value.getHours()} Hrs`);
                        })
                        .on('end', function(value) {
                            const newTimestamp = `${value.getFullYear()}${value.getMonth() > 9 ? value.getMonth() : '0'+value.getMonth()}${value.getDate() > 9 ? value.getDate() : '0'+value.getDate()}${value.getHours() > 9 ? value.getHours() : '0'+value.getHours()}`;
                            visParameters.updateTimestamp(newTimestamp);
                        });
        
        sliderDiv.call(slider);

        // wire up data assimilation phase change
        d3.selectAll("input[name='daStage']")
        .on("change", function() {
            visParameters.updateDaStage(this.value);
        });
        defaultParameters['daStage'] = d3.selectAll("input[name='daStage']")
                                            .nodes()
                                            .filter(function(d) {   
                                                return d.checked;
                                            })[0].value;

        // wire up inflation change
        d3.selectAll("input[name='inflation']")
        .on("change", function() {
            visParameters.updateInflation(this.value === 'none' ? null : this.value);
        });
        defaultParameters['inflation'] = d3.selectAll("input[name='inflation']")
                                            .nodes()
                                            .filter(function(d) {   
                                                return d.checked;
                                            })[0].value;

        // wire up gauge location checkbox
        d3.select("#gaugeLoc")
            .on("change", function() {
                if (d3.select(this).property("checked")) {
                    drawGaugeLocations(visParameters.projection, true);
                }
                else {
                    drawGaugeLocations(visParameters.projection, false);
                }
            });
    });

    return defaultParameters;
}

async function init() {
    // draw visualization scaffolds
    const baseMapParams = await setupBaseMap();
    await setupDistributionPlots();
    await setupHydrographPlots();

    const uiParams = new uiParameters(baseMapParams.tooltip, baseMapParams.path, baseMapParams.projection);

    // setup UI elements
    const defaultParameters = await setupControlPanel(uiParams);

    uiParams.init(defaultParameters);
}

init();