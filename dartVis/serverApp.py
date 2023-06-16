import argparse
import netCDF4 as nc
from flask import Flask, render_template

app = Flask('dartVis')

if __name__=='__main__':
    parser = argparse.ArgumentParser(prog="DARTVis - Visual Analysis Tool for Ensemble Forecast Models")
    parser.add_argument('-f', '--modelFilesPath', required=True)

    args = parser.parse_args()

    @app.route('/')
    def index():
        return render_template('index.html')
    
    app.run(host='127.0.0.1', port=8000, debug=True, use_evalex=False, use_reloader=True)
