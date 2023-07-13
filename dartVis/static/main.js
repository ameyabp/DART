import { setupBaseMap } from './baseMap.js';
import { setupDistributionPlots } from './distribution_plot.js';
import { drawMapData } from './render.js';

class uiParameters {
    constructor(tooltip, path) {
        this.tooltip = tooltip;
        this.path = path;
    }

    init(defaultParameters, distributionPlotParams) {
        this.stateVariable = defaultParameters.stateVariable;
        this.timestamp = defaultParameters.timestamp;
        this.aggregation = defaultParameters.aggregation;
        this.daStage = defaultParameters.daStage;
        this.inflation = defaultParameters.inflation;

        this.distributionPlotParams = distributionPlotParams;

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
        // sample timestamp - 2022101400
        data.timestamps = data.timestamps.map(function(d) {
            return new Date(
                d.substring(0,4),   // year
                d.substring(4,6),    // month
                d.substring(6,8),   // day
                d.substring(8)  // hours
            )
        });

        const minTimestamp = d3.min(data.timestamps);
        defaultParameters['timestamp'] = `${minTimestamp.getFullYear()}${minTimestamp.getMonth() > 9 ? minTimestamp.getMonth() : '0'+minTimestamp.getMonth()}${minTimestamp.getDate() > 9 ? minTimestamp.getDate() : '0'+minTimestamp.getDate()}${minTimestamp.getHours() > 9 ? minTimestamp.getHours() : '0'+minTimestamp.getHours()}`;

        d3.select("#timestamp-display")
            .html(`<b>Timestamp:</b><br/> ${minTimestamp.getFullYear()}/${minTimestamp.getMonth() > 9 ? minTimestamp.getMonth() : '0'+minTimestamp.getMonth()}/${minTimestamp.getDate() > 9 ? minTimestamp.getDate() : '0'+minTimestamp.getDate()} : ${minTimestamp.getHours() > 9 ? minTimestamp.getHours() : '0'+minTimestamp.getHours()} Hrs`);

        var sliderDiv = d3.select("#timeSlider-svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .append("g")
            .attr("transform", `translate(50, 20)`)

        const width = document.getElementById('timeSlider-div').clientWidth * 0.8;

        var slider = d3.sliderHorizontal()
                        .min(d3.min(data.timestamps))
                        .max(d3.max(data.timestamps))
                        .width(width)
                        .displayValue(false)
                        .default(minTimestamp)
                        .on('onchange', function(value) {
                            d3.select("#timestamp-display")
                                .html(`<b>Timestamp:</b><br/> ${value.getFullYear()}/${value.getMonth() > 9 ? value.getMonth() : '0'+value.getMonth()}/${value.getDate() > 9 ? value.getDate() : '0'+value.getDate()} : ${value.getHours() > 9 ? value.getHours() : '0'+value.getHours()} Hrs`);
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
    });

    return defaultParameters;
}

async function init() {
    // draw visualization scaffolds
    const baseMapParams = await setupBaseMap();
    const distributionPlotParams =  await setupDistributionPlots();

    const uiParams = new uiParameters(baseMapParams.tooltip, baseMapParams.path);

    // setup UI elements
    const defaultParameters = await setupControlPanel(uiParams);

    uiParams.init(defaultParameters, distributionPlotParams);
    // drawDistribution(1, visParameters.timestamp, visParameters.daStage, visParameters.colorEncodingStateVariable, distributionPlotParams);
}

init();