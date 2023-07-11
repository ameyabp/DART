import os
import json
import argparse
import functools
import numpy as np
import netCDF4 as nc
from flask import Flask, render_template, request

app = Flask('dartVis')

class RouteLinkData:
    def __init__(self, routeLinkFileName):
        # struct definition for storing the route link data
        routeLinkData = nc.Dataset(routeLinkFileName)
        self.numLinks = len(routeLinkData.variables['link'][:])
        self.lat = routeLinkData.variables['lat'][:]
        self.lon = routeLinkData.variables['lon'][:]
        self.fromIndices = routeLinkData.variables['fromIndices'][:]
        self.fromIndsStart = routeLinkData.variables['fromIndsStart'][:]
        self.fromIndsEnd = routeLinkData.variables['fromIndsEnd'][:]
        noUpLinks = self.fromIndsStart == 0
        self.numUpLinks = self.fromIndsEnd - self.fromIndsStart + 1
        self.numUpLinks[noUpLinks] = 0

    def getDataBoundingBoxLonLat(self):
        self.bbox = {
            'lonMin': float(min(self.lon)),
            'lonMax': float(max(self.lon)),
            'latMin': float(min(self.lat)),
            'latMax': float(max(self.lat))
        }

        self.centroid = {
            'lon': float(np.mean(self.lon)),
            'lat': float(np.mean(self.lat))
        }

        return {
            'bbox': self.bbox,
            'centroid': self.centroid
        }

class Ensemble:
    def __init__(self, modelFilesPath, rlData):
        # list of timestamps for the ensemble models 
        self.modelFilesPath = modelFilesPath
        self.timestamps = [f for f in os.listdir(self.modelFilesPath) if os.path.isdir(os.path.join(self.modelFilesPath, f))]
        self.timestamps.sort()
        
        # number of models in the ensemble
        netcdfFiles = [f for f in os.listdir(os.path.join(self.modelFilesPath, self.timestamps[0])) if 'member' in f]
        self.numEnsembleModels = int(len(netcdfFiles)/4)

        # gathering meta data
        self.sampleOutputData = nc.Dataset(os.path.join(self.modelFilesPath, self.timestamps[0], netcdfFiles[0]))
        self.stateVariables = list(self.sampleOutputData.variables.keys())
        self.stateVariables.remove('time')
        # priorInflationStateVariables = list(map(lambda x: x + '_inflation_prior', self.stateVariables))
        # posteriorInflationStateVariables = list(map(lambda x: x + '_inflation_posterior', self.stateVariables))
        # self.stateVariables.extend(priorInflationStateVariables)
        # self.stateVariables.extend(posteriorInflationStateVariables)

        # routeLink data
        self.rl = rlData

    def getEnsembleModelTimestampsList(self):
        return self.timestamps
    
    def getStateVariables(self):
        return self.stateVariables
    
    def getStateData(self, timestamp, aggregation, daStage, colorEncodingStateVariable, sizeEncodingStateVariable, inflation=None):
        # load required forecast data from netcdf files to python data structures in main memory
        # map data structure hierarchy: timestamp, aggregation, daStage, stateVariable, location

        # construct required netcdf file name
        if inflation:
            filename = f'{daStage}_{inflation}_{aggregation}.{timestamp}.nc'
        else:
            filename = f'{daStage}_{aggregation}.{timestamp}.nc'

        ncData = nc.Dataset(os.path.join(self.modelFilesPath, timestamp, filename))
        assert(self.rl.numLinks == len(ncData.variables[self.stateVariables[0]][:]))

        renderData = []
        for i in range(self.rl.numLinks):
            if self.rl.numUpLinks[i] == 0:
                continue

            linkIndices = self.rl.fromIndices[self.rl.fromIndsStart[i]-1: self.rl.fromIndsEnd[i]]-1
            assert (self.rl.numUpLinks[i] == len(linkIndices))

            for linkID in linkIndices:
                dataPoint = {}
                dataPoint['linkID'] = int(linkID)

                dataPoint[colorEncodingStateVariable] = float(ncData.variables[colorEncodingStateVariable][linkID].item())
                dataPoint[sizeEncodingStateVariable] = float(ncData.variables[sizeEncodingStateVariable][linkID].item())
            
                lineData = {
                    'type': "LineString",
                    'coordinates': []
                }

                lineData['coordinates'].append([float(self.rl.lon[i]), float(self.rl.lat[i])])
                lineData['coordinates'].append([float(self.rl.lon[linkID]), float(self.rl.lat[linkID])])

                dataPoint['line'] = lineData
                renderData.append(dataPoint)
        
        return renderData
    
    def getEnsembleData(self, timestamp, daStage, stateVariable, linkID):
        ensembleData = []

        # construct required netcdf file name
        for id in range(self.numEnsembleModels):
            memberID = str(id+1).rjust(4, '0')
            filename = f'{daStage}_member_{memberID}.{timestamp}.nc'

            memberData = nc.Dataset(os.path.join(self.modelFilesPath, timestamp, filename))

            dataPoint = {}
            dataPoint['memberID'] = id
            dataPoint[stateVariable] = float(memberData.variables[stateVariable][linkID].item())

            ensembleData.append(dataPoint)

        return ensembleData

if __name__=='__main__':
    parser = argparse.ArgumentParser(prog="DARTVis - Visual Analysis Tool for Ensemble Forecast Models")
    parser.add_argument('-f', '--modelFilesPath', required=True)
    parser.add_argument('-rl', '--routeLinkFilePath', required=True)

    args = parser.parse_args()
    rlData = RouteLinkData(args.routeLinkFilePath)
    ensemble = Ensemble(args.modelFilesPath, rlData)
    # ensemble.getStateData('2022101400', 'mean', 'analysis', 'qlink1')
    
    @app.route('/', methods=['GET'])
    def index():
        return render_template('index.html')
    
    @app.route('/getEnsembleModelTimestamps', methods=['GET'])
    def getEnsembleModelTimestamps():
        if request.method == 'GET':
            return json.dumps(ensemble.getEnsembleModelTimestampsList())
        else:
            print('Expected GET method, but received ' + request.method)
        
    @app.route('/getStateData', methods=['POST'])
    def getStateData():
        if request.method == 'POST':
            query = json.loads(request.data)
            timestamp = query['timestamp']
            aggregation = query['aggregation']
            daStage = query['daStage']
            sizeEncodingStateVariable = query['sizeEncodingStateVariable']
            colorEncodingStateVariable = query['colorEncodingStateVariable']
            inflation = query['inflation']

            stateData = ensemble.getStateData(timestamp, aggregation, daStage, colorEncodingStateVariable, sizeEncodingStateVariable, inflation)
            return json.dumps(stateData)
        else:
            print('Expected POST method, but received ' + request.method)

    @app.route('/getStateVariables', methods=['GET'])
    def getStateVariables():
        if request.method == 'GET':
            return json.dumps(ensemble.getStateVariables())
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
            daStage = query['daStage']
            stateVariable = query['stateVariable']
            linkID = query['linkID']

            ensembleData = ensemble.getEnsembleData(timestamp, daStage, stateVariable, linkID)
            return json.dumps(ensembleData)
        else:
            print('Expected POST method, but received ' + request.method)

    app.run(host='127.0.0.1', port=8000, debug=True, use_evalex=False, use_reloader=True)
