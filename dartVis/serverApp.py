import os
import json
import argparse
import functools
import netCDF4 as nc
from flask import Flask, render_template, request

app = Flask('dartVis')

class RouteLinkData:
    def __init__(self, routeLinkFileName):
        # struct definition for storing the route link data
        routeLinkData = nc.Dataset(routeLinkFileName)
        self.numLinks = routeLinkData.dimensions['feature_id'].size
        self.lat = routeLinkData.variables['lat'][:]
        self.lon = routeLinkData.variables['lon'][:]
        self.fromIndices = routeLinkData.variables['fromIndices'][:]
        self.fromIndsStart = routeLinkData.variables['fromIndsStart'][:]
        self.fromIndsEnd = routeLinkData.variables['fromIndsEnd'][:]
        noUpLinks = self.fromIndsStart == 0
        self.numUpLinks = self.fromIndsEnd - self.fromIndsStart + 1
        self.numUpLinks[noUpLinks] = 0

class Ensemble:
    def __init__(self, modelFilesPath, rlData):
        # list of timestamps for the ensemble models 
        self.timestamps = [f for f in os.listdir(modelFilesPath) if os.path.isdir(os.path.join(modelFilesPath, f))]
        self.timestamps.sort()
        
        # number of models in the ensemble
        netcdfFiles = [f for f in os.listdir(os.path.join(modelFilesPath, self.timestamps[0])) if 'member' in f]
        self.numEnsembleModels = len(netcdfFiles)/4

        # gathering meta data
        self.sampleOutputData = nc.Dataset(os.path.join(modelFilesPath, self.timestamps[0], netcdfFiles[0]))
        self.stateVariables = list(self.sampleOutputData.variables.keys())
        self.stateVariables.remove('time')

        # routeLink data
        self.rl = rlData

        # load forecast data from netcdf files to python data structures in main memory
        # map data structure hierarchy: timestamp, aggregation, daStage, stateVariable, location
        wrfHydroData = {}   # key=timestamp, value=aggregationData
        for timestamp in self.timestamps:
            for ctr,f in enumerate(os.listdir(os.path.join(modelFilesPath, timestamp))):
                if 'out' in f or 'output' in f:
                    continue

                if 'mean' in f:
                    aggregation = 'mean'
                elif 'sd' in f:
                    aggregation = 'sd'
                else:
                    # 'member' in f:
                    idx = f.find('member')
                    aggregation = f[idx:idx+11]

                if 'analysis' in f:
                    daStage = 'analysis'
                else:
                    # 'preassim' in f
                    daStage = 'forecast'

                if 'priorinf' in f:
                    stateVarPrefix = '_inflation_prior'
                elif 'postinf' in f:
                    stateVarPrefix = '_inflation_posterior'
                else:
                    stateVarPrefix = ''

                ncData = nc.Dataset(os.path.join(modelFilesPath, timestamp, f))
                assert(self.rl.numLinks == len(ncData.variables[self.stateVariables[0]][:]))

                renderData = []
                for i in range(self.rl.numLinks):
                    dataPoint = {}
                    for stateVariable in self.stateVariables:
                        dataPoint[stateVariable + stateVarPrefix] = ncData.variables[stateVariable][i]
                    
                    linePoints = []
                    linePoints.append([self.rl.lon[i], self.rl.lat[i]])
                    locationIndices = self.rl.fromIndices[self.rl.fromIndsStart[i]: self.rl.fromIndsEnd[i]]
                    for locInd in locationIndices:
                        linePoints.append([self.rl.lon[locInd], self.rl.lat[locInd]])

                    dataPoint['line'] = linePoints
                    renderData.append(dataPoint)

                wrfHydroData.setdefault(timestamp, {}).setdefault(aggregation, {}).setdefault(daStage, renderData)

                print('Processed file '+ f)
                ctr += 1
                if ctr == 10:
                    break
            break   # testing for one timestamp data first, comment out when everything is confirmed to work
        
        print(wrfHydroData)

    def getEnsembleModelTimestampsList(self):
        return self.timestamps
    
    def getStateVariables(self):
        return self.stateVariables
    
    # def getStateData(self, timestamp, aggregation, daStage, stateVariable):
    #     if self.validateStateVariable(var):

if __name__=='__main__':
    parser = argparse.ArgumentParser(prog="DARTVis - Visual Analysis Tool for Ensemble Forecast Models")
    parser.add_argument('-f', '--modelFilesPath', required=True)
    parser.add_argument('-rl', '--routeLinkFilePath', required=True)

    args = parser.parse_args()
    rlData = RouteLinkData(args.routeLinkFilePath)
    ensemble = Ensemble(args.modelFilesPath, rlData)
    
    @app.route('/', methods=['GET'])
    def index():
        return render_template('index.html')
    
    @app.route('/getEnsembleModelTimestamps', methods=['GET'])
    def getEnsembleModelTimestamps():
        if request.method == 'GET':
            timestampList = json.dumps(ensemble.getEnsembleModelTimestampsList())
            return timestampList
        else:
            print('Expected GET method, but received ' + request.method)
        
    @app.route('/getStateData', methods=['GET'])
    def getStateData(stateVariable, timestamp):
        stateData = ensemble.getStateData(stateVariable, timestamp)
        # TODO: error handling
        return stateData

    app.run(host='127.0.0.1', port=8000, debug=True, use_evalex=False, use_reloader=True)
