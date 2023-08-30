import xarray as xr
import os

class DataCube:
    def __init__(self):
        self.xrDataset = xr.Dataset()

    def addDataArray(self, varName, array):
        self.xrDataset = self.xrDataset.assign(variables={varName: array})

    def getDataArray(self, varName):
        return self.xrDataset[varName]
    
    def getSize(self):
        return self.xrDataset
    
    def compute_object_size(self):
        # obj should be an xarray dataset
        print(f'{round(self.xrDataset.nbytes / (1024 * 1024 * 1024), 3)} GB')

    def saveNetCDF(self, createXarrayFromScratch):
        if not os.path.exists('datacube'):
            os.mkdir('datacube')
            
        for varName in self.xrDataset.keys():
            if createXarrayFromScratch and not os.path.exists(os.path.join('datacube', f'{varName}.nc')):
                # don't have overwrite permission on glade
                # TODO: handle overwrite issue correctly
                self.xrDataset[varName].to_netcdf(path=os.path.join('datacube', f'{varName}.nc'), mode='w', format='NETCDF4')
                # TODO: check the dask and unlimited_dims options for live monitoring capabilities

    def bookkeeping(self, createXarrayFromScratch):
        self.compute_object_size()
        self.saveNetCDF(createXarrayFromScratch)
        print("Finished bookkeeping")