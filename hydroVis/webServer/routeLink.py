import netCDF4 as nc
import xarray as xr
import numpy as np

# descriptor attributes for links
linkDescriptor = [
    'lat', 'lon',   # link or gauge location
    'srcLon', 'srcLat', # link start location, NA for gauge
    'dstLon', 'dstLat', # link end location, NA for gauge
    'gauge' # enum: 0=no gauge, 1=assimilated gauge, 2=non-assimilated gauge
]

# Class definition for parsing routeLink data
# and creating xarray dataArray data structure from it

class RouteLinkData:
    def __init__(self, routeLinkFileName):
        routeLinkData = nc.Dataset(routeLinkFileName)
        self.linkIDs = routeLinkData.variables['link'][:]
        self.numLinks = len(self.linkIDs)
        self.lat = routeLinkData.variables['lat'][:]
        self.lon = routeLinkData.variables['lon'][:]
        self.fromIndices = routeLinkData.variables['fromIndices'][:]
        self.fromIndsStart = routeLinkData.variables['fromIndsStart'][:]
        self.fromIndsEnd = routeLinkData.variables['fromIndsEnd'][:]
        noUpLinks = self.fromIndsStart == 0
        self.numUpLinks = self.fromIndsEnd - self.fromIndsStart + 1
        self.numUpLinks[noUpLinks] = 0
        # we only care about links which are themselves uplinks to some links
        # the linkID array indices for such links is in fromIndices
        self.linkIDCoords = self.fromIndices
        
        self.linkData = xr.DataArray(
            data=np.ndarray((len(self.linkIDCoords), len(linkDescriptor))),
            coords={'linkID': self.linkIDCoords, 'descriptor': linkDescriptor},
            dims=['linkID', 'descriptor'],
            name='linkDescriptor'
        )
    
        for i in range(self.numLinks):
            if self.numUpLinks[i] == 0:
                continue

            linkIDArrayIndices = self.fromIndices[self.fromIndsStart[i] - 1: self.fromIndsEnd[i]] - 1
            # it should have been
            # linkIndices = self.rl.fromIndices[self.rl.fromIndsStart[i]: self.rl.fromIndsEnd[i]+1]
            # but the netcdf files were written using 1-based indexes for fromIndsStart, fromIndsEnd and fromIndices
            # therefore to make it work with python's netCDF library, we do a '-1' for each of the three array accesses
            assert (self.numUpLinks[i] == len(linkIDArrayIndices))

            for linkIDArrayIndex in linkIDArrayIndices:
                # to be consistent with the way the data was written in the original netCDF files (1-based index)
                # change from python netCDF library's 0-based index to 1-based index with a '+1'
                # only for storing the linkIDArrayIndex, not for accessing the lat and lon arrays
                self.linkData.loc[dict(linkID=linkIDArrayIndex+1, descriptor='lat')] = (self.lat[linkIDArrayIndex] + self.lat[i]) / 2
                self.linkData.loc[dict(linkID=linkIDArrayIndex+1, descriptor='lon')] = (self.lon[linkIDArrayIndex] + self.lon[i]) / 2
                self.linkData.loc[dict(linkID=linkIDArrayIndex+1, descriptor='srcLat')] = self.lat[linkIDArrayIndex]
                self.linkData.loc[dict(linkID=linkIDArrayIndex+1, descriptor='srcLon')] = self.lon[linkIDArrayIndex]
                self.linkData.loc[dict(linkID=linkIDArrayIndex+1, descriptor='dstLat')] = self.lat[i]
                self.linkData.loc[dict(linkID=linkIDArrayIndex+1, descriptor='dstLon')] = self.lon[i]
                self.linkData.loc[dict(linkID=linkIDArrayIndex+1, descriptor='gauge')] = 0
    
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
