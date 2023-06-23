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
    def __init__(self, modelFilesPath):
        # list of timestamps for the ensemble models 
        self.timestamps = [f for f in os.listdir(modelFilesPath) if '.' not in f]
        self.timestamps.sort()
        # number of models in the ensemble
        netcdfFiles = [f for f in os.listdir(os.path.join(modelFilesPath, self.timestamps[0])) if 'member' in f]
        self.numEnsembleModels = len(netcdfFiles)/4
        sampleOutputData = nc.Dataset(os.path.join(modelFilesPath, self.timestamps[0], netcdfFiles[0]))
        self.stateVariables = list(sampleOutputData.variables.keys())

    def getEnsembleModelTimestampsList(self):
        return self.timestamps
    
    def getForecastData(self):
        # load the required forecast data from the netcdf files to python data structures in the main memory
        return

    def validateStateVariable(self, var):
        # validate if the state variable being asked for is being forecasted by the ensemble
        if var in self.stateVariables:
            return True
        else:
            return False
        
    # def getStateData(self, var, timestamp):
    #     if self.validateStateVariable(var):

ensembleData = {
    'timestamp': {
        'mean': {
            'qlink1': {
                'lon-lat': 'scalarValue'
            },
            'z_gwssubbas': {
                'lon-lat': 'scalarValue'
            },
            'time': {
                'lon-lat': 'scalarValue'
            }
        },
        'sd': {
            'qlink1': {
                'lon-lat': 'scalarValue'
            },
            'z_gwssubbas': {
                'lon-lat': 'scalarValue'
            },
            'time': {
                'lon-lat': 'scalarValue'
            }
        },
        'member1': {
            'qlink1': {
                'lon-lat': 'scalarValue'
            },
            'z_gwssubbas': {
                'lon-lat': 'scalarValue'
            },
            'time': {
                'lon-lat': 'scalarValue'
            }
        },
        'priorinf': {
            'qlink1': {
                'lon-lat': 'scalarValue'
            },
            'z_gwssubbas': {
                'lon-lat': 'scalarValue'
            },
            'time': {
                'lon-lat': 'scalarValue'
            }
        },
        'postinf': {
            'qlink1': {
                'lon-lat': 'scalarValue'
            },
            'z_gwssubbas': {
                'lon-lat': 'scalarValue'
            },
            'time': {
                'lon-lat': 'scalarValue'
            }
        }
    }
}

if __name__=='__main__':
    parser = argparse.ArgumentParser(prog="DARTVis - Visual Analysis Tool for Ensemble Forecast Models")
    parser.add_argument('-f', '--modelFilesPath', required=True)

    args = parser.parse_args()
    ensemble = Ensemble(args.modelFilesPath)
    
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
