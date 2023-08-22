import xarray as xr
import netCDF4 as nc

# Class definition for parsing openloop data
# and creating xarray dataArray data structure from it

class OpenLoopData:
    def __init__(self, dataFilesPath, timestamps, rlData):
        self.dataFilesPath = dataFilesPath
