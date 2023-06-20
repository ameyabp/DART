import os
import json
import argparse
import functools
import netCDF4 as nc
from flask import Flask, render_template, request

app = Flask('dartVis')

class Ensemble:
    def __init__(self, modelFilesPath):
        # list of timestamps for the ensemble models 
        self.timestamps = [f for f in os.listdir(modelFilesPath) if '.' not in f]
        self.timestamps.sort()
        # number of models in the ensemble
        netcdfFiles = [f for f in os.listdir(os.path.join(modelFilesPath, self.timestamps[0])) if 'member' in f]
        self.numEnsembleModels = len(netcdfFiles)/4

    def getEnsembleModelTimestampsList(self):
        return self.timestamps

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

    app.run(host='127.0.0.1', port=8000, debug=True, use_evalex=False, use_reloader=True)
