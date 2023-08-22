import os
import json
import argparse
import numpy as np
import netCDF4 as nc
from flask import Flask, render_template, request

from webServer.helper import obs_seq_to_netcdf_wrapper
from webServer.assimilationData import AssimilationData
from webServer.routeLink import RouteLinkData
from webServer.observationData import ObservationData
from webServer.openloopData import OpenLoopData

app = Flask('hydroVis')

if __name__=='__main__':
    parser = argparse.ArgumentParser(prog="HydroVis - Visual Analysis Tool for DART Forecasting of Hydro Models")
    parser.add_argument('-da', '--daDataPath', required=True)
    parser.add_argument('-ol', '--openLoopDataPath', required=True)
    parser.add_argument('-rl', '--routeLinkFilePath', required=True)
    parser.add_argument('-p', '--portNum', type=int, default=8000)

    args = parser.parse_args()
    rlData = RouteLinkData(args.routeLinkFilePath)
    ensemble = AssimilationData(args.daDataPath, rlData)
    observations = ObservationData(args.daDataPath, ensemble.timestamps, rlData)
    openLoop = OpenLoopData(args.openLoopDataPath, ensemble.timestamps, rlData)
    
    @app.route('/', methods=['GET'])
    def index():
        return render_template('index.html')
        
    @app.route('/getStateData', methods=['POST'])
    def getStateData():
        if request.method == 'POST':
            query = json.loads(request.data)
            timestamp = query['timestamp']
            aggregation = query['aggregation']
            daStage = query['daStage']
            stateVariable = query['stateVariable']
            inflation = None if query['inflation'] == 'none' else query['inflation']

            stateData = ensemble.getStateData(timestamp, aggregation, daStage, stateVariable, inflation)
            return json.dumps(stateData)
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

    @app.route('/getEnsembleData', methods=['POST'])
    def getEnsembleData():
        if request.method == 'POST':
            query = json.loads(request.data)
            timestamp = query['timestamp']
            stateVariable = query['stateVariable']
            linkID = query['linkID']

            ensembleData = ensemble.getEnsembleData(timestamp, stateVariable, linkID)
            return json.dumps(ensembleData)
        else:
            print('Expected POST method, but received ' + request.method)

    @app.route('/getHydrographStateVariableData', methods=['POST'])
    def getHydrographStateVariableData():
        if request.method == 'POST':
            query = json.loads(request.data)
            linkID = query['linkID']
            stateVariable = query['stateVariable']
            aggregation = query['aggregation']
            readFromGaugeLocation = query['readFromGaugeLocation']

            if readFromGaugeLocation and stateVariable == 'qlink1':
                hydrographData = observations.getHydrographStateVariableData(linkID, aggregation)
            else:
                hydrographData = ensemble.getHydrographStateVariableData(linkID, aggregation, stateVariable)
            
            return json.dumps(hydrographData)
        else:
            print('Expected POST method, but received ' + request.method)

    @app.route('/getGaugeLocations', methods=['GET'])
    def getGaugeLocations():
        if request.method == 'GET':
            return json.dumps(observations.getGaugeLocations())
        else:
            print('Expected GET method, but received ' + request.method)

    @app.route('/getHydrographInflationData', methods=['POST'])
    def getHydrographInflationData():
        if request.method == 'POST':
            query = json.loads(request.data)
            linkID = query['linkID']
            stateVariable = query['stateVariable']
            inflation = query['inflation']

            hydrographData = ensemble.getHydrographInflationData(linkID, stateVariable, inflation)
            return json.dumps(hydrographData)
        else:
            print('Expected POST method, but received ' + request.method)

    app.run(host='127.0.0.1', port=args.portNum, debug=True, use_evalex=False, use_reloader=True)
