import json
import os
import math
import argparse
from flask import Flask, render_template, request
from time import time_ns

from webServer.dataCube import DataCube
from webServer.routeLink import RouteLinkData
from webServer.assimilationData import AssimilationData
from webServer.observationData import ObservationData
from webServer.openloopData import OpenLoopData

app = Flask('hydroVis')

if __name__=='__main__':
    parser = argparse.ArgumentParser(prog="HydroVis - Visual Analysis Tool for DART Forecasting of Hydro Models")
    parser.add_argument('-da', '--daDataPath', required=True)
    parser.add_argument('-ol', '--openLoopDataPath', required=True)
    parser.add_argument('-rl', '--routeLinkFilePath', required=True)
    parser.add_argument('-p', '--portNum', type=int, default=8000)
    parser.add_argument('-xr', '--createXarrayFromScratch', action='store_true')

    args = parser.parse_args()

    start = time_ns()
    datacube = DataCube()

    rlData = RouteLinkData(args.routeLinkFilePath, datacube, args.createXarrayFromScratch)
    print("Loaded route link data")
    ensemble = AssimilationData(args.daDataPath, rlData, datacube, args.createXarrayFromScratch)
    print("Loaded assimilation data")
    observations = ObservationData(args.daDataPath, ensemble.timestamps, datacube, args.createXarrayFromScratch)
    print("Loaded observation data")
    openLoop = OpenLoopData(args.openLoopDataPath, ensemble.timestamps, ensemble.numEnsembleModels, rlData, datacube, args.createXarrayFromScratch)
    print("Loaded open loop data")

    print(f'createDatacube: {(time_ns() - start) * math.pow(10, -6)} ms')
    # datacube bookkeeping
    datacube.bookkeeping(args.createXarrayFromScratch)

    @app.route('/', methods=['GET'])
    def index():
        return render_template('index.html')
        
    @app.route('/getRouteLinkData', methods=['POST'])
    def getRouteLinkData():
        if request.method == 'POST':
            start = time_ns()

            routeLinkData = json.dumps(rlData.getRouteLinkData())
            
            print(f'getRouteLinkData: {(time_ns() - start) * math.pow(10, -6)} ms')
            return routeLinkData
        else:
            print('Expected POST method, but received ' + request.method)

    @app.route('/getMapData', methods=['POST'])
    # netcdf files access
    def getMapData():
        if request.method == 'POST':
            start = time_ns()
            query = json.loads(request.data)
            timestamp = query['timestamp']
            aggregation = query['aggregation']
            daStage = query['daStage']
            stateVariable = query['stateVariable']
            inflation = None if query['inflation'] == 'none' else query['inflation']

            # stateData = json.dumps(ensemble.getStateData(timestamp, aggregation, daStage, stateVariable, inflation))
            stateData = json.dumps(ensemble.getMapData(datacube, timestamp, aggregation, daStage, stateVariable, inflation))

            print(f'getMapData: {(time_ns() - start) * math.pow(10, -6)} ms')
            return stateData
        else:
            print('Expected POST method, but received ' + request.method)

    @app.route('/getUIParameters', methods=['GET'])
    def getUIParameters():
        if request.method == 'GET':
            return json.dumps(ensemble.getUIParameters())
        else:
            print('Expected GET method, but received ' + request.method)

    @app.route('/getTimestamps', methods=['GET'])
    def getTimestamps():
        if request.method == 'GET':
            return json.dumps(ensemble.getTimestamps())
        else:
            print('Expected GET method, but received ' + request.method)

    @app.route('/getLonLatBoundingBox', methods=['GET'])
    def getLonLatBoundingBox():
        if request.method == 'GET':
            return json.dumps(rlData.getDataBoundingBoxLonLat())
        else:
            print('Expected GET method, but received ' + request.method)

    @app.route('/getDistributionData', methods=['POST'])
    def getDistributionData():
        if request.method == 'POST':
            start = time_ns()
            query = json.loads(request.data)
            timestamp = query['timestamp']
            stateVariable = query['stateVariable']
            linkID = query['linkID']

            # netcdf file access
            distributionData = json.dumps(ensemble.getEnsembleData(timestamp, stateVariable, linkID))

            # xarray access
            # distributionData =json.dumps(ensemble.getDistributionData(datacube, timestamp, stateVariable, linkID))
            
            print(f'getDistributionData: {(time_ns() - start) * math.pow(10, -6)} ms')

            return distributionData
        else:
            print('Expected POST method, but received ' + request.method)

    @app.route('/getHydrographStateVariableData', methods=['POST'])
    def getHydrographStateVariableData():
        if request.method == 'POST':
            start = time_ns()
            query = json.loads(request.data)
            linkID = query['linkID']
            stateVariable = query['stateVariable']
            aggregation = query['aggregation']

            # netcdf files access
            readFromGaugeLocation = query['readFromGaugeLocation']

            if readFromGaugeLocation and stateVariable == 'qlink1':
                hydrographData = json.dumps(observations.getHydrographStateVariableData(linkID, aggregation))
            else:
                hydrographData = json.dumps(ensemble.getHydrographStateVariableData(linkID, aggregation, stateVariable))

            # xarray access
            # hydrographData = json.dumps(ensemble.getStateVariableHydrographData(datacube, linkID, aggregation, stateVariable))

            print(f'getHydrographStateVariableData: {(time_ns() - start) * math.pow(10, -6)} ms')
            
            return hydrographData
        else:
            print('Expected POST method, but received ' + request.method)

    @app.route('/getGaugeLocations', methods=['GET'])
    def getGaugeLocations():
        if request.method == 'GET':
            start = time_ns()
            
            # gaugeLocationData = json.dumps(observations.getGaugeLocations())
            gaugeLocationData = json.dumps(observations.getObservationGaugeLocationData())
            
            print(f'getGaugeLocations: {(time_ns() - start) * math.pow(10, -6)} ms')
            return gaugeLocationData
        else:
            print('Expected GET method, but received ' + request.method)

    @app.route('/getHydrographInflationData', methods=['POST'])
    def getHydrographInflationData():
        if request.method == 'POST':
            start = time_ns()
            query = json.loads(request.data)
            linkID = query['linkID']
            stateVariable = query['stateVariable']
            inflation = query['inflation']

            # netcdf files access
            hydrographData = json.dumps(ensemble.getHydrographInflationData(linkID, stateVariable, inflation))

            # xarray access
            # hydrographData = json.dumps(ensemble.getInflationHydrographData(datacube, linkID, stateVariable, inflation))

            print(f'getInflationHydrographData: {(time_ns() - start) * math.pow(10, -6)} ms')
            return hydrographData
        else:
            print('Expected POST method, but received ' + request.method)

    app.run(host='127.0.0.1', port=args.portNum, debug=True, use_evalex=False, use_reloader=False)
