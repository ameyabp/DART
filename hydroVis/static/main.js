import { uiParameters } from './uiParameters.js';
import { setupBaseMap, drawMapData, drawMapDataV2, drawGaugeLocations, drawLinkData } from './map.js';
import { setupDistributionPlot, drawDistribution } from './distribution.js';
import { setupHydrographPlots, drawHydrographStateVariable, drawHydrographStateVariableV2, drawHydrographInflation } from './hydrograph.js';
import { getJSDateObjectFromTimestamp, wrfHydroStateVariables } from './helper.js';

function updateStateVariable(stateVariable) {
    uiParameters.updateStateVariable(stateVariable);
    // call all the relevant renderer functions
    // drawMapDataV2(); // xarray access
    drawMapData();  // netcdf files access
    if (uiParameters.linkID) {
        drawDistribution();
        // drawHydrographStateVariableV2();    // xarray access
        drawHydrographStateVariable();  // netcdf files access
        drawHydrographInflation();
    }
}

function updateAggregation(aggregation) {
    uiParameters.updateAggregation(aggregation);
    // call all the relevant renderer functions
    // drawMapDataV2(); // xarray access
    drawMapData();  // netcdf files access
    if (uiParameters.linkID) {
        // drawHydrographStateVariableV2();    // xarray access
        drawHydrographStateVariable();  // netcdf files access
    }
}

function updateDaStage(daStage) {
    uiParameters.updateDaStage(daStage);
    // call all the relevant renderer functions
    // drawMapDataV2(); // xarray access
    drawMapData();  // netcdf files access
}

function updateInflation(inflation) {
    uiParameters.updateInflation(inflation);
    // call all the relevant renderer functions
    // drawMapDataV2(); // xarray access
    drawMapData();  // netcdf files access
    if (uiParameters.linkID) {
        drawHydrographInflation();
    }
}

function updateShowGaugeLocations(showGaugeLocations) {
    uiParameters.updateShowGaugeLocations(showGaugeLocations);
    // call all the relevant renderer functions
    drawGaugeLocations();
}

function updateTimestamp(timestamp) {
    uiParameters.updateTimestamp(timestamp);
    // call all the relevant renderer functions
    // drawMapDataV2(); // xarray access
    drawMapData();  // netcdf files access
    if (uiParameters.linkID) {
        drawDistribution();
    }
}

async function setupControlPanel() {
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
                updateStateVariable(this.value);
            })
            .selectAll("option")
            .data(data.stateVariables)
            .enter()
                .append("option")
                .text(function(d) {
                    return wrfHydroStateVariables[d].commonName;
                })
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

                    updateAggregation(this.value);
                }
                else {
                    // individual ensemble member selected
                    d3.selectAll("input[name='aggregation']")
                        .property("checked", false);

                    updateAggregation(+this.value);
                }
            });
        defaultParameters['aggregation'] = d3.selectAll("input[name='aggregation']")
                                            .nodes()
                                            .filter(function(d) {   
                                                return d.checked;
                                            })[0].value;

        // wire up data assimilation phase change
        d3.selectAll("input[name='daStage']")
        .on("change", function() {
            updateDaStage(this.value);
        });
        defaultParameters['daStage'] = d3.selectAll("input[name='daStage']")
                                            .nodes()
                                            .filter(function(d) {   
                                                return d.checked;
                                            })[0].value;

        // wire up inflation change
        d3.selectAll("input[name='inflation']")
        .on("change", function() {
            updateInflation(this.value === 'none' ? null : this.value);
        });
        const defaultInflationValue = d3.selectAll("input[name='inflation']")
                                .nodes()
                                .filter(function(d) {   
                                    return d.checked;
                                })[0].value;
        defaultParameters['inflation'] = defaultInflationValue === 'none' ? null : defaultInflationValue;

        // wire up gauge location checkbox
        d3.select("#gaugeLoc")
            .on("change", function() {
                updateShowGaugeLocations(d3.select(this).property("checked"));
            });

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
                            updateTimestamp(newTimestamp);
                        });
        
        sliderDiv.call(slider);
    });

    return defaultParameters;
}

async function init() {
    // draw visualization scaffolds
    await setupBaseMap();
    await setupDistributionPlot();
    await setupHydrographPlots();

    // setup UI elements
    const defaultParameters = await setupControlPanel();
    uiParameters.init(defaultParameters);

    // await drawLinkData();
    // await drawMapDataV2();
    await drawMapData();
}

init();