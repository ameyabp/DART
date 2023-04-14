clear all
close all

% This script applies a bias correction to CAM6 reanalysis meteorology roughly
% following Yong-Fei Zhang (UT-Austin) dissertation approach. Meteorology data
% from the site location of interest should be used as 'truth'.
% All met variables use 'scaling' approach with exception for snow/rain precip.
% This script is intended to be used after running CAM6_site_grid.sh 

% Enter in site location data. US-NR1 flux tower used as example
SITE_lat=40.03;  
SITE_lon=-105.55+360; % lon should be positive (degrees East only)

%%% These probably should be queried from the raw data file, not entered manually %%%%%
%%FIX THIS%%
%%FIX THIS%%
SITE_doma_area=0.000274675326661479; % radian^2 cell area (unique to grid location)
SITE_doma_aream=0.000274672687732932; % radian^2 cell area mapping
SITE_doma_mask=1   ; % all values =1 
SITE_doma_frac=1   ; % all values =1 area fraction
%%FIX THIS%%

% Input data files
path_CAM = '/glade/work/bmraczka/CAM6_NR1/';
path_towermet = '/glade/work/bmraczka/SIFMIP2/tower_met_forcing/';
ens_mem=80;  % CAM6 reanalysis provides 80 total members, 1-80 is valid
 
% Output data files
%path_scaled_CAM = '<enter output file path here>';        %% Requires user input %%
path_scaled_CAM = '/glade/work/bmraczka/CAM6_NR1/test/';

% Include Diagnostics?  true/false
Diagnostics=false;


% Site level grid extract CAM6 naming convention:  

% CAM6_NR1.cpl_NINST.ha2x1hi.YEAR.nc   % SOLAR:     a2x1hi_Faxa_swndr,a2x1hi_Faxa_swvdr,a2x1hi_Faxa_swndf,a2x1hi_Faxa_swvdf   
% CAM6_NR1.cpl_NINST.ha2x3h.YEAR.nc    % NON-SOLAR: a2x3h_Faxa_rainc,a2x3h_Faxa_rainl,a2x3h_Faxa_snowc,a2x3h_Faxa_snowl,a2x3h_Faxa_lwdn
% CAM6_NR1.cpl_NINST.ha2x1h.YEAR.nc    % 1hr state: a2x1h_Sa_u,a2x1h_Sa_v 
% CAM6_NR1.cpl_NINST.ha2x3h.YEAR.nc    % 3hr state; a2x3h_Sa_tbot,a2x3h_Sa_shum,a2x3h_Sa_pbot
% CAM6_NR1.cpl_NINST.ha2x3h.YEAR.nc    % unchanged 3hr state: Sa_z Sa_ptem Sa_dens Sa_pslv Sa_topo


% 'yearstr' is list of years where both CAM6 reanalysis and tower met forcing
% is available and the years we will create the bias-correct/scaled reanalysis product
yearstr={'2011','2012','2013','2014','2015','2016','2017','2018','2019'};
% 'yeartower' adds previous year to cover the UTC to MST shift 
yeartower={'2010','2011','2012','2013','2014','2015','2016','2017','2018','2019'};

% Generate ensemble cell array
ens_range=[1:ens_mem];
enstr=cell(1,ens_mem);

     for i=1:ens_mem
         enstr{i}=sprintf('%04d', ens_range(i));
     end

% Site level met forcing uses PLUMBER2 protocol 
% time -->30 min increments in LST (MST)
% Tair-->Kelvin
% Qair--> specific humidity (kg kg-1)
% Wind--> (m/s)
% SWdown --> (W/m2)
% LWdown ---> (W/m2)
% Precip --> (mm/s) or (kg m-2 s-1)
% Psurf  --> (Pa)

% Load Tower Met Forcing Data

TBOT_main=load_towermet('Tair',yeartower,path_towermet);
SH_main=load_towermet('Qair',yeartower,path_towermet);
WIND_main=load_towermet('Wind',yeartower,path_towermet);
FSDS_main=load_towermet('SWdown',yeartower,path_towermet);
FLDS_main=load_towermet('LWdown',yeartower,path_towermet);
PRECTmms_main=load_towermet('Precip',yeartower,path_towermet);
PSRF_main=load_towermet('Psurf',yeartower,path_towermet);
YEAR_main=load_towermet('year',yeartower,path_towermet);


% Main Loop: Loads CAM, applies correction, writes corrected CAM file
  for ii = 1:length(yearstr);

    % Time Zones:
    % Tower Meterology Forcing (PLUMBER):  LST (MST):  UTC-7
    % CAM6 Reanalsysis: UTC

    % Syncing time steps:
    % Tower Forcing (LST) must be advanced 7 hours to synchronize with CAM6 (UTC)
    % In addition there is a 6 hour forward shift in the CAM6 reanalysis yearly files
    % Total shift of Tower Forcing: +13 hours with exception of
    % SW radiation which was shifted +12 hours for better synchronization

    % Both CAM6 and Tower forcing include leap days


    % Select only indices of YEAR ii
    indices=find(YEAR_main==str2num(yearstr{ii}));

    % Pushing met forcing 13 hours forward (go back 26 indices)
    ta_30=TBOT_main(indices(1)-26:indices(end)-26)';                        % TBOT (Kelvin)
    q_30=SH_main(indices(1)-26:indices(end)-26)';                           % SH (kg kg-1)
    wind_30=WIND_main(indices(1)-26:indices(end)-26)';                      % Total Wind (m/s) 
    sw_30=FSDS_main(indices(1)-24:indices(end)-24)';                        % FSDS (W/m2)
    lw_30=FLDS_main(indices(1)-26:indices(end)-26)';                        % FLDS (W/m2)
    ppt_30=PRECTmms_main(indices(1)-26:indices(end)-26)';                   % PRECTmms  (mm/s) or (kg m-2 s-1)
    ps_30=PSRF_main(indices(1)-26:indices(end)-26)';                        % PSRF (Pa)

    clear indices

    % Generate 1 and 3 hourly averages from tower met forcing to compare against
    % CAM6 reanalysis 

    ta_1hr=mean(reshape(ta_30,2,numel(ta_30)/2),1);        
    q_1hr=mean(reshape(q_30,2,numel(q_30)/2),1);           
    wind_1hr=mean(reshape(wind_30,2,numel(wind_30)/2),1);  
    sw_1hr=mean(reshape(sw_30,2,numel(sw_30)/2),1);        
    lw_1hr=mean(reshape(lw_30,2,numel(lw_30)/2),1);        
    ppt_1hr=mean(reshape(ppt_30,2,numel(ppt_30)/2),1);     
    ps_1hr=mean(reshape(ps_30,2,numel(ps_30)/2),1);


    ta_3hr=mean(reshape(ta_1hr,3,numel(ta_1hr)/3),1);       
    q_3hr=mean(reshape(q_1hr,3,numel(q_1hr)/3),1);         
    wind_3hr=mean(reshape(wind_1hr,3,numel(wind_1hr)/3),1); 
    sw_3hr=mean(reshape(sw_1hr,3,numel(sw_1hr)/3),1);       
    lw_3hr=mean(reshape(lw_1hr,3,numel(lw_1hr)/3),1);       
    ppt_3hr=mean(reshape(ppt_1hr,3,numel(ppt_1hr)/3),1);    
    ps_3hr=mean(reshape(ps_1hr,3,numel(ps_1hr)/3),1);       

    clear ta_30 q_30 wind_30 sw_30 lw_30 ppt_30 ps_30


      % Load CAM Ensemble Loop 
      for jj = 1:80;  

         %Downloading all ensemble members for all  reanalysis variables
    
         %SOLAR
         Faxa_swndr(jj,:) = load_CAM('a2x1hi_Faxa_swndr',enstr{jj},yearstr{ii},path_CAM,'SOLAR');
         Faxa_swvdr(jj,:) = load_CAM('a2x1hi_Faxa_swvdr',enstr{jj},yearstr{ii},path_CAM,'SOLAR');
         Faxa_swndf(jj,:) = load_CAM('a2x1hi_Faxa_swndf',enstr{jj},yearstr{ii},path_CAM,'SOLAR');
         Faxa_swvdf(jj,:) = load_CAM('a2x1hi_Faxa_swvdf',enstr{jj},yearstr{ii},path_CAM,'SOLAR');         

         %NONSOLAR (3hr)
         Faxa_rainc(jj,:) = load_CAM('a2x3h_Faxa_rainc',enstr{jj},yearstr{ii},path_CAM,'hour3');
         Faxa_rainl(jj,:) = load_CAM('a2x3h_Faxa_rainl',enstr{jj},yearstr{ii},path_CAM,'hour3');
         Faxa_snowc(jj,:) = load_CAM('a2x3h_Faxa_snowc',enstr{jj},yearstr{ii},path_CAM,'hour3');
         Faxa_snowl(jj,:) = load_CAM('a2x3h_Faxa_snowl',enstr{jj},yearstr{ii},path_CAM,'hour3');

         % 1hr STATE
         Sa_u(jj,:) = load_CAM('a2x1h_Sa_u',enstr{jj},yearstr{ii},path_CAM,'hour1');
         Sa_v(jj,:) = load_CAM('a2x1h_Sa_v',enstr{jj},yearstr{ii},path_CAM,'hour1');

         % 3hr STATE
         Sa_tbot(jj,:) = load_CAM('a2x3h_Sa_tbot',enstr{jj},yearstr{ii},path_CAM,'hour3');
         Sa_shum(jj,:) = load_CAM('a2x3h_Sa_shum',enstr{jj},yearstr{ii},path_CAM,'hour3');
         Sa_pbot(jj,:) = load_CAM('a2x3h_Sa_pbot',enstr{jj},yearstr{ii},path_CAM,'hour3');
         Faxa_lwdn(jj,:) = load_CAM('a2x3h_Faxa_lwdn',enstr{jj},yearstr{ii},path_CAM,'hour3');

         % 3hr STATE Unchanged
         Sa_z(jj,:) = load_CAM('a2x3h_Sa_z',enstr{jj},yearstr{ii},path_CAM,'hour3');
         Sa_ptem(jj,:) = load_CAM('a2x3h_Sa_ptem',enstr{jj},yearstr{ii},path_CAM,'hour3');     
         Sa_dens(jj,:) = load_CAM('a2x3h_Sa_dens',enstr{jj},yearstr{ii},path_CAM,'hour3'); 
         Sa_pslv(jj,:) = load_CAM('a2x3h_Sa_pslv',enstr{jj},yearstr{ii},path_CAM,'hour3');
         Sa_topo(jj,:) = load_CAM('a2x3h_Sa_topo',enstr{jj},yearstr{ii},path_CAM,'hour3');

      end %% Load CAM ensemble loop
     
  %% Initialize the ensemble mean scale values to the default of '0' which means no change
  Faxa_swndr_scale =zeros(1,length(Faxa_swndr(1,:))); 
  Faxa_swvdr_scale =zeros(1,length(Faxa_swvdr(1,:))); 
  Faxa_swndf_scale =zeros(1,length(Faxa_swndf(1,:))); 
  Faxa_swvdf_scale =zeros(1,length(Faxa_swvdf(1,:))); 

  Faxa_rainc_scale =zeros(1,length(Faxa_rainc(1,:))); 
  Faxa_rainl_scale =zeros(1,length(Faxa_rainl(1,:))); 
  Faxa_snowc_scale =zeros(1,length(Faxa_snowc(1,:))); 
  Faxa_snowl_scale =zeros(1,length(Faxa_snowl(1,:)));
       
  Faxa_rain_scale =zeros(1,length(Faxa_rainl(1,:)));
  Faxa_snow_scale =zeros(1,length(Faxa_snowl(1,:))); 

  Sa_u_scale =zeros(1,length(Sa_u(1,:))); 
  Sa_v_scale =zeros(1,length(Sa_v(1,:))); 

  Sa_tbot_scale =zeros(1,length(Sa_tbot(1,:))); 
  Sa_shum_scale =zeros(1,length(Sa_shum(1,:))); 
  Sa_pbot_scale =zeros(1,length(Sa_pbot(1,:))); 
  Faxa_lwdn_scale  =zeros(1,length(Faxa_lwdn(1,:))); 

  Sa_z_scale =zeros(1,length(Sa_z(1,:))); 
  Sa_ptem_scale =zeros(1,length(Sa_ptem(1,:))); 
  Sa_dens_scale =zeros(1,length(Sa_dens(1,:))); 
  Sa_pslv_scale =zeros(1,length(Sa_pslv(1,:)));
  Sa_topo_scale =zeros(1,length(Sa_topo(1,:)));
      
  % Calculate the ensemble mean for each CAM6 variable
  Faxa_swndr_mean= mean(Faxa_swndr,1);
  Faxa_swvdr_mean= mean(Faxa_swvdr,1);
  Faxa_swndf_mean= mean(Faxa_swndf,1);
  Faxa_swvdf_mean= mean(Faxa_swvdf,1);
     
  Faxa_rainc_mean= mean(Faxa_rainc,1);
  Faxa_rainl_mean= mean(Faxa_rainl,1);
  Faxa_snowc_mean= mean(Faxa_snowc,1);
  Faxa_snowl_mean= mean(Faxa_snowl,1);

  Sa_u_mean=mean(Sa_u,1);
  Sa_v_mean=mean(Sa_v,1);

  % Calculate CAM6 total wind vector for comparison with tower forcing
  Sa_wind_mean= (Sa_v_mean.^2+Sa_u_mean.^2).^0.5;

  Sa_tbot_mean = mean(Sa_tbot,1);
  Sa_shum_mean = mean(Sa_shum,1);
  Sa_pbot_mean = mean(Sa_pbot,1);
  Faxa_lwdn_mean = mean(Faxa_lwdn,1);


  % Need this initialization for precip loop
  Faxa_rain=Faxa_rainl;
  Faxa_snow=Faxa_snowl;


      %% Calculate the scaled correction factors for each year 

      %% SOLAR 1 hour resolution
      for ind=1:(length(sw_1hr));

        if (Faxa_swndr_mean(ind)+Faxa_swvdr_mean(ind)+Faxa_swndf_mean(ind)+Faxa_swvdr_mean(ind)>0)      
      
           Faxa_swndr_scale(ind)= Faxa_swndr_mean(ind) .* (sw_1hr(ind)./(Faxa_swndr_mean(ind)+Faxa_swvdr_mean(ind) ...
                                                             +Faxa_swndf_mean(ind)+Faxa_swvdf_mean(ind)));
           Faxa_swvdr_scale(ind)= Faxa_swvdr_mean(ind) .* (sw_1hr(ind)./(Faxa_swndr_mean(ind)+Faxa_swvdr_mean(ind) ...
                                                             +Faxa_swndf_mean(ind)+Faxa_swvdf_mean(ind)));
           Faxa_swndf_scale(ind)= Faxa_swndf_mean(ind) .* (sw_1hr(ind)./(Faxa_swndr_mean(ind)+Faxa_swvdr_mean(ind) ...
                                                             +Faxa_swndf_mean(ind)+Faxa_swvdf_mean(ind)));
           Faxa_swvdf_scale(ind)= Faxa_swvdf_mean(ind) .* (sw_1hr(ind)./(Faxa_swndr_mean(ind)+Faxa_swvdr_mean(ind) ...
                                                             +Faxa_swndf_mean(ind)+Faxa_swvdf_mean(ind)));
        end
      end 

      %% NON-SOLAR 3 hour resolution      
      for ind=1:(length(ppt_3hr));
      
      % Precip loop needs to query adjusted temperature to re-assign precip to snow or rain

          if ta_3hr(ind)>273.15
             % Forcing all unadjusted precip ensemble members to new variable Faxa_rain according to adjusted temperature
             Faxa_rain(:,ind)=Faxa_rainc(:,ind)+Faxa_rainl(:,ind)+Faxa_snowc(:,ind)+Faxa_snowl(:,ind);
             Faxa_snow(:,ind)=0;

             % Adjustment will only be applied to total rain. CLM does not care if precip is convective/large scale 
             Faxa_rainc_scale(ind)= 0;
             Faxa_rainl_scale(ind)= 0;
             Faxa_snowc_scale(ind)= 0;
             Faxa_snowl_scale(ind)= 0;
             Faxa_rain_scale(ind)= ppt_3hr(ind);
          else
            % Forcing all unadjusted precip ensemble members to new variable Faxa_ snow according to adjusted temperature
            Faxa_snow(:,ind)= Faxa_rainc(:,ind)+Faxa_rainl(:,ind)+Faxa_snowc(:,ind)+Faxa_snowl(:,ind);
            Faxa_rain(:,ind)=0;

            % Adjustment will only be applied to total snow. CLM does not care if precip is convective/large scale
             Faxa_rainc_scale(ind)=0;
             Faxa_rainl_scale(ind)=0;
             Faxa_snowc_scale(ind)=0;
             Faxa_snowl_scale(ind)=0;
             Faxa_snow_scale(ind)= ppt_3hr(ind);
          end

      end

  Faxa_rain_mean= mean(Faxa_rain,1);
  Faxa_snow_mean= mean(Faxa_snow,1);

  % 1hr STATE
  Sa_u_scale = Sa_u_mean.*(wind_1hr./Sa_wind_mean); 
  Sa_v_scale = Sa_v_mean.*(wind_1hr./Sa_wind_mean);

  % 3hr STATE
  Sa_tbot_scale = Sa_tbot_mean.*(ta_3hr./Sa_tbot_mean);
  Sa_shum_scale = Sa_shum_mean.*(q_3hr./Sa_shum_mean);
  Sa_pbot_scale = Sa_pbot_mean.*(ps_3hr./Sa_pbot_mean);
  Faxa_lwdn_scale = Faxa_lwdn_mean.*(lw_3hr./Faxa_lwdn_mean);

  % 3hr STATE (Unchanged - no scaling)
  %Sa_z_scale    =  Sa_z_mean;
  %Sa_ptem_scale =  Sa_ptem_mean;
  %Sa_dens_scale =  Sa_desn_mean;
  %Sa_pslv_scale =  Sa_pslv_mean;
  %Sa_topo_scale =  Sa_topo_mean;

  % Apply the scaled corrections identically to each ensemble member, then generate corrected CAM6 reanalysis
  % ensemble_scaled=ensemble + (ensemble_mean_scaled-ensemble_mean)
  % Put clamping (hard bounds) on non-physical values.

  % SOLAR
  % e.g Faxa_swndr(ensemble(80),time(1hr,3hr)
  Faxa_swndr_adjust  = Faxa_swndr+repmat(Faxa_swndr_scale-Faxa_swndr_mean,80,1); Faxa_swndr_adjust(Faxa_swndr_adjust<0)=0;  
  Faxa_swvdr_adjust  = Faxa_swvdr+repmat(Faxa_swvdr_scale-Faxa_swvdr_mean,80,1); Faxa_swvdr_adjust(Faxa_swvdr_adjust<0)=0;
  Faxa_swndf_adjust  = Faxa_swndf+repmat(Faxa_swndf_scale-Faxa_swndf_mean,80,1); Faxa_swndf_adjust(Faxa_swndf_adjust<0)=0;
  Faxa_swvdf_adjust  = Faxa_swvdf+repmat(Faxa_swvdf_scale-Faxa_swvdf_mean,80,1); Faxa_swvdf_adjust(Faxa_swvdf_adjust<0)=0;

  %NONSOLAR
  % Purposely setting convective rain and snow to zero
  % Purposely setting snow and rain adjusted variables to large scale snow (snowl) and rain (rainl)
  % These will carry the ensemble spread for snow/rain
 
  Faxa_rainc_adjust = Faxa_rainc+repmat(Faxa_rainc_scale-Faxa_rainc_mean,80,1); Faxa_rainc_adjust(:,:)=0;
  Faxa_rainl_adjust = Faxa_rain+repmat(Faxa_rain_scale-Faxa_rain_mean,80,1); Faxa_rainl_adjust(Faxa_rainl_adjust<0)=0;
  Faxa_snowc_adjust = Faxa_snowc+repmat(Faxa_snowc_scale-Faxa_snowc_mean,80,1); Faxa_snowc_adjust(:,:)=0;
  Faxa_snowl_adjust = Faxa_snow+repmat(Faxa_snow_scale-Faxa_snow_mean,80,1); Faxa_snowl_adjust(Faxa_snowl_adjust<0)=0;

  % 1hr STATE, meridional and zonal winds allowed to go negative
  Sa_u_adjust = Sa_u+repmat(Sa_u_scale-Sa_u_mean,80,1);
  Sa_v_adjust = Sa_v+repmat(Sa_v_scale-Sa_v_mean,80,1); 

  % 3hr STATE
  Sa_tbot_adjust = Sa_tbot+repmat(Sa_tbot_scale-Sa_tbot_mean,80,1); Sa_tbot_adjust(Sa_tbot_adjust<0)=0;
  Sa_shum_adjust = Sa_shum+repmat(Sa_shum_scale-Sa_shum_mean,80,1); Sa_shum_adjust(Sa_shum_adjust<0)=0;
  Sa_pbot_adjust = Sa_pbot+repmat(Sa_pbot_scale-Sa_pbot_mean,80,1); Sa_pbot_adjust(Sa_pbot_adjust<0)=0;
  Faxa_lwdn_adjust = Faxa_lwdn+repmat(Faxa_lwdn_scale-Faxa_lwdn_mean,80,1); Faxa_lwdn_adjust(Faxa_lwdn_adjust<0)=0;

  % (3hr STATE Unchanged)
  %Sa_z = Sa_z+repmat(Sa_z_scale-Sa_z_mean,80,1); 
  %Sa_ptem = Sa_ptem+repmat(Sa_ptem_scale-Sa_ptem_mean,80,1);
  %Sa_dens = Sa_dens+repmat(Sa_dens_scale-Sa_dens_mean,80,1);
  %Sa_pslv = Sa_pslv+repmat(Sa_pslv_scale-Sa_pslv_mean,80,1);
  %Sa_topo = Sa_topo+repmat(Sa_topo_scale-Sa_topo_mean,80,1);


      if Diagnostics==true

         plot_diagnostic(yearstr{ii},Faxa_swndr,Faxa_swndf,Faxa_swvdr,Faxa_swvdf, ...
                         Faxa_rainl,Faxa_rainc,Faxa_snowl,Faxa_snowc,Sa_tbot, ...
		         Sa_shum,Sa_u,Sa_v,Sa_pbot,Faxa_lwdn,Faxa_rain,Faxa_snow, ...
                         Faxa_swndr_adjust,Faxa_swndf_adjust,Faxa_swvdr_adjust, ...
                         Faxa_swvdf_adjust,Faxa_rainl_adjust,Faxa_snowl_adjust, ...
                         Sa_tbot_adjust,Sa_shum_adjust,Sa_u_adjust,Sa_v_adjust, ...
                         Sa_pbot_adjust,Faxa_lwdn_adjust, ...
                         sw_1hr,ppt_1hr,ta_1hr,q_1hr,wind_1hr,ps_1hr,lw_1hr, ...
                         ppt_3hr,ta_3hr);


      end 


  % Assign the adjusted CAM variables to netcdf files for each ensemble member/ year

  % CAM6_NR1.cpl_NINST.ha2x1hi.YEAR.nc   % SOLAR:     a2x1hi_Faxa_swndr,a2x1hi_Faxa_swvdr,a2x1hi_Faxa_swndf,a2x1hi_Faxa_swvdf   
  % CAM6_NR1.cpl_NINST.ha2x3h.YEAR.nc    % NON-SOLAR: a2x3h_Faxa_rainc,a2x3h_Faxa_rainl,a2x3h_Faxa_snowc,a2x3h_Faxa_snowl,a2x3h_Faxa_lwdn
  % CAM6_NR1.cpl_NINST.ha2x1h.YEAR.nc    % 1hr state: a2x1h_Sa_u,a2x1h_Sa_v 
  % CAM6_NR1.cpl_NINST.ha2x3h.YEAR.nc    % 3hr state; a2x3h_Sa_tbot,a2x3h_Sa_shum,a2x3h_Sa_pbot
  % CAM6_NR1.cpl_NINST.ha2x3h.YEAR.nc    % unchanged 3hr state: Sa_z Sa_ptem Sa_dens Sa_pslv Sa_topo


  time_SOLAR = ncread([path_CAM enstr{1} '/CAM6_NR1.cpl_' enstr{1} '.ha2x1hi.' yearstr{ii} '.nc'],'time');
  time_NONSOLAR = ncread([path_CAM enstr{1} '/CAM6_NR1.cpl_' enstr{1} '.ha2x3h.' yearstr{ii} '.nc'],'time');
  time_1hr = ncread([path_CAM enstr{1} '/CAM6_NR1.cpl_' enstr{1} '.ha2x1h.' yearstr{ii} '.nc'],'time');
  time_3hr= ncread([path_CAM enstr{1} '/CAM6_NR1.cpl_' enstr{1} '.ha2x3h.' yearstr{ii} '.nc'],'time');

  dim_time_SOLAR=length(time_SOLAR);        % ha2x1hi
  dim_time_NONSOLAR=length(time_NONSOLAR);  % ha2x3h
  dim_time_1hr=length(time_1hr);            % ha2x1h
  dim_time_3hr=length(time_3hr);            % ha2x3h

  time_bnds_SOLAR = ncread([path_CAM enstr{1} '/CAM6_NR1.cpl_' enstr{1} '.ha2x1hi.' yearstr{ii} '.nc'],'time_bnds');
  time_bnds_NONSOLAR = ncread([path_CAM enstr{1} '/CAM6_NR1.cpl_' enstr{1} '.ha2x3h.' yearstr{ii} '.nc'],'time_bnds');
  time_bnds_1hr = ncread([path_CAM enstr{1} '/CAM6_NR1.cpl_' enstr{1} '.ha2x1h.' yearstr{ii} '.nc'],'time_bnds');
  time_bnds_3hr = ncread([path_CAM enstr{1} '/CAM6_NR1.cpl_' enstr{1} '.ha2x3h.' yearstr{ii} '.nc'],'time_bnds');

       
  % Allocate met variables in dimension necessary for assignment to netcdf

  swndr_assign=ones(1,1,length(Faxa_swndr(1,:)))*NaN;  swvdr_assign=ones(1,1,length(Faxa_swvdr(1,:)))*NaN;
  swndf_assign=ones(1,1,length(Faxa_swndf(1,:)))*NaN;  swvdf_assign=ones(1,1,length(Faxa_swvdf(1,:)))*NaN;
  rainc_assign=ones(1,1,length(Faxa_rainc(1,:)))*NaN;  rainl_assign=ones(1,1,length(Faxa_rainl(1,:)))*NaN;
  snowc_assign=ones(1,1,length(Faxa_snowc(1,:)))*NaN; snowl_assign=ones(1,1,length(Faxa_snowl(1,:)))*NaN;
  u_assign=ones(1,1,length(Sa_u(1,:)))*NaN;            v_assign=ones(1,1,length(Sa_v(1,:)))*NaN;
  tbot_assign=ones(1,1,length(Sa_tbot(1,:)))*NaN;      shum_assign=ones(1,1,length(Sa_shum(1,:)))*NaN;
  pbot_assign=ones(1,1,length(Sa_pbot(1,:)))*NaN;      lwdn_assign=ones(1,1,length(Faxa_lwdn(1,:)))*NaN;
  z_assign=ones(1,1,length(Sa_z(1,:)))*NaN;            ptem_assign=ones(1,1,length(Sa_ptem(1,:)))*NaN;
  dens_assign=ones(1,1,length(Sa_dens(1,:)))*NaN;      pslv_assign=ones(1,1,length(Sa_pslv(1,:)))*NaN;
  topo_assign=ones(1,1,length(Sa_topo(1,:)))*NaN;

    for jj = 1:80;  %% Ensemble assignment loop         
      % Assign the met variables to appropriate 3-dimension format
        
      swndr_assign(1,1,:)=Faxa_swndr_adjust(jj,:);                swvdr_assign(1,1,:)=Faxa_swvdr_adjust(jj,:);
      swndf_assign(1,1,:)=Faxa_swndf_adjust(jj,:);                swvdf_assign(1,1,:)=Faxa_swvdf_adjust(jj,:);
      rainc_assign(1,1,:)=Faxa_rainc_adjust(jj,:);                rainl_assign(1,1,:)=Faxa_rainl_adjust(jj,:);
      snowc_assign(1,1,:)=Faxa_snowc_adjust(jj,:);                snowl_assign(1,1,:)=Faxa_snowl_adjust(jj,:);
      u_assign(1,1,:)=Sa_u_adjust(jj,:);                          v_assign(1,1,:)=Sa_v_adjust(jj,:);
      tbot_assign(1,1,:)=Sa_tbot_adjust(jj,:);                    shum_assign(1,1,:)=Sa_shum_adjust(jj,:);
      pbot_assign(1,1,:)=Sa_pbot_adjust(jj,:);                    lwdn_assign(1,1,:)=Faxa_lwdn_adjust(jj,:);
      z_assign(1,1,:)=Sa_z(jj,:);                                 ptem_assign(1,1,:)=Sa_ptem(jj,:);
      dens_assign(1,1,:)=Sa_dens(jj,:);                           pslv_assign(1,1,:)=Sa_pslv(jj,:);
      topo_assign(1,1,:)=Sa_topo(jj,:);

      % Write SOLAR (ha2x1hi) File

      ncname=[path_scaled_CAM enstr{jj} '/CAM6_NR1.cpl_' enstr{jj} '.ha2x1hi.' yearstr{ii} '.nc'];
      ncid=netcdf.create(ncname,'CLOBBER');
      netcdf.close(ncid);

      nccreate(ncname,'a2x1hi_Faxa_swndf','Dimensions',{'a2x1hi_nx',1,'a2x1hi_ny',1,'time',Inf},'Datatype','single','Format','classic'); 
      ncwrite(ncname,'a2x1hi_Faxa_swndf',swndf_assign)
      write_netcdf_att(ncname,'a2x1hi_Faxa_swndf',single(1.e30),'W m-2','Diffuse near-infrared incident solar radiation', ...
                       'surface_downward_diffuse_shortwave_flux_due_to_near_infrared_radiation','a2x1hi')

      nccreate(ncname,'a2x1hi_Faxa_swndr','Dimensions',{'a2x1hi_nx',1,'a2x1hi_ny',1,'time',Inf},'Datatype','single','Format','classic');
      ncwrite(ncname,'a2x1hi_Faxa_swndr',swndr_assign)
      write_netcdf_att(ncname,'a2x1hi_Faxa_swndr',single(1.e30),'W m-2','Direct near-infrared incident solar radiation', ...
                       'surface_downward_direct_shortwave_flux_due_to_near_infrared_radiation','a2x1hi')
               
      nccreate(ncname,'a2x1hi_Faxa_swvdf','Dimensions',{'a2x1hi_nx',1,'a2x1hi_ny',1,'time',Inf},'Datatype','single','Format','classic');
      ncwrite(ncname,'a2x1hi_Faxa_swvdf',swvdf_assign)
      write_netcdf_att(ncname,'a2x1hi_Faxa_swvdf',single(1.e30),'W m-2','Diffuse visible incident solar radiation', ...
                       'surface_downward_diffuse_shortwave_flux_due_to_visible_radiation','a2x1hi')

      nccreate(ncname,'a2x1hi_Faxa_swvdr','Dimensions',{'a2x1hi_nx',1,'a2x1hi_ny',1,'time',Inf},'Datatype','single','Format','classic');
      ncwrite(ncname,'a2x1hi_Faxa_swvdr',swvdr_assign)
      write_netcdf_att(ncname,'a2x1hi_Faxa_swvdr',single(1.e30),'W m-2','Direct visible incident solar radiation', ...
                       'surface_downward_direct_shortwave_flux_due_to_visible_radiation','a2x1hi')

      nccreate(ncname,'doma_area','Dimensions',{'doma_nx',1,'doma_ny',1},'Format','classic');
      ncwrite(ncname,'doma_area',SITE_doma_area)
      write_netcdf_att(ncname,'doma_area',0.,'radian^2','cell_area_model','cell area from model','doma')

      nccreate(ncname,'doma_aream','Dimensions',{'doma_nx',1,'doma_ny',1},'Format','classic');
      ncwrite(ncname,'doma_aream',SITE_doma_aream)
      write_netcdf_att(ncname,'doma_aream',0.,'radian^2','cell_area_mapping','cell area from mapping file','doma')

      nccreate(ncname,'doma_frac','Dimensions',{'doma_nx',1,'doma_ny',1},'Format','classic');
      ncwrite(ncname,'doma_frac',SITE_doma_frac)
      write_netcdf_att(ncname,'doma_frac',0.,'1','area_fraction','area fraction','doma')

      nccreate(ncname,'doma_lat','Dimensions',{'doma_nx',1,'doma_ny',1},'Format','classic');
      ncwrite(ncname,'doma_lat',SITE_lat)
      write_netcdf_att(ncname,'doma_lat',0.,'degrees north','latitude','latitude','doma')
        
      nccreate(ncname,'doma_lon','Dimensions',{'doma_nx',1,'doma_ny',1},'Format','classic');
      ncwrite(ncname,'doma_lon',SITE_lon)
      write_netcdf_att(ncname,'doma_lon',0.,'degrees east','longitude','longitude','doma')

      nccreate(ncname,'doma_mask','Dimensions',{'doma_nx',1,'doma_ny',1},'Format','classic');
      ncwrite(ncname,'doma_mask',SITE_doma_mask)
      write_netcdf_att(ncname,'doma_mask',0.,'1','mask','mask','doma')

      nccreate(ncname,'time','Dimensions',{'time',Inf},'Format','classic');
      ncwrite(ncname,'time',time_SOLAR)
          if str2num(yearstr{ii})==2011
             ncwriteatt(ncname,'time','units',['days since 2010-07-01 00:00:00'])
          else
             ncwriteatt(ncname,'time','units',['days since 2011-01-01 00:00:00'])
          end
      ncwriteatt(ncname,'time','calendar','gregorian')
      ncwriteatt(ncname,'time','bounds','time_bnds')

      nccreate(ncname,'time_bnds','Dimensions',{'ntb',2,'time',Inf},'Format','classic');
      ncwrite(ncname,'time_bnds',time_bnds_SOLAR)

      ncwriteatt(ncname,'/','creation_method', 'Scaling CAM6 regional product to tower site level met')
      ncwriteatt(ncname,'/','creation_date', datestr(now))
      ncwriteatt(ncname,'/','author', 'Brett Raczka, bmraczka@ucar.edu')


      % Write NON-SOLAR (ha2x3h) File
      ncname=[path_scaled_CAM enstr{jj} '/CAM6_NR1.cpl_' enstr{jj} '.ha2x3h.' yearstr{ii} '.nc'];
      ncid=netcdf.create(ncname,'CLOBBER');
      netcdf.close(ncid);

      nccreate(ncname,'time','Dimensions',{'time',Inf},'Format','classic'); 
      ncwrite(ncname,'time',time_NONSOLAR)
          if str2num(yearstr{ii})==2011
             ncwriteatt(ncname,'time','units',['days since 2010-07-01 00:00:00'])
          else
             ncwriteatt(ncname,'time','units',['days since 2011-01-01 00:00:00'])
          end
      ncwriteatt(ncname,'time','calendar','gregorian')
      ncwriteatt(ncname,'time','bounds','time_bnds')
      ncwriteatt(ncname,'time','cell_methods','time: mean')

      nccreate(ncname,'time_bnds','Dimensions',{'ntb',2,'time',Inf},'Format','classic');
      ncwrite(ncname,'time_bnds',time_bnds_NONSOLAR)
      ncwriteatt(ncname,'time_bnds','cell_methods','time: mean')

      nccreate(ncname,'doma_lat','Dimensions',{'doma_nx',1,'doma_ny',1},'Format','classic');
      ncwrite(ncname,'doma_lat',SITE_lat)
      write_netcdf_att(ncname,'doma_lat',0.,'degrees north','latitude','latitude','doma')

      nccreate(ncname,'doma_lon','Dimensions',{'doma_nx',1,'doma_ny',1},'Format','classic');
      ncwrite(ncname,'doma_lon',SITE_lon)
      write_netcdf_att(ncname,'doma_lon',0.,'degrees east','longitude','longitude','doma')

      nccreate(ncname,'doma_area','Dimensions',{'doma_nx',1,'doma_ny',1},'Format','classic');
      ncwrite(ncname,'doma_area',SITE_doma_area)
      write_netcdf_att(ncname,'doma_area',0.,'radian^2','cell_area_model','cell area from model','doma')

      nccreate(ncname,'doma_aream','Dimensions',{'doma_nx',1,'doma_ny',1},'Format','classic');
      ncwrite(ncname,'doma_aream',SITE_doma_aream)
      write_netcdf_att(ncname,'doma_aream',0.,'radian^2','cell_area_mapping','cell area from mapping file','doma')

      nccreate(ncname,'doma_mask','Dimensions',{'doma_nx',1,'doma_ny',1},'Format','classic');
      ncwrite(ncname,'doma_mask',SITE_doma_mask)
      write_netcdf_att(ncname,'doma_mask',0.,'1','mask','mask','doma')

      nccreate(ncname,'doma_frac','Dimensions',{'doma_nx',1,'doma_ny',1},'Format','classic');
      ncwrite(ncname,'doma_frac',SITE_doma_frac)
      write_netcdf_att(ncname,'doma_frac',0.,'1','area_fraction','area fraction','doma')
                                                                                                                        
      nccreate(ncname,'a2x3h_Sa_z','Dimensions',{'a2x3h_nx',1,'a2x3h_ny',1,'time',Inf},'Datatype','single','Format','classic');
      ncwrite(ncname,'a2x3h_Sa_z',z_assign)
      write_netcdf_att(ncname,'a2x3h_Sa_z',single(1.e30),'m','Height at the lowest model level','height','a2x3h','time: mean')

      nccreate(ncname,'a2x3h_Sa_topo','Dimensions',{'a2x3h_nx',1,'a2x3h_ny',1,'time',Inf},'Datatype','single','Format','classic');
      ncwrite(ncname,'a2x3h_Sa_topo',topo_assign)
      write_netcdf_att(ncname,'a2x3h_Sa_topo',single(1.e30),'m','Surface height','height','a2x3h','time: mean')

      nccreate(ncname,'a2x3h_Sa_tbot','Dimensions',{'a2x3h_nx',1,'a2x3h_ny',1,'time',Inf},'Datatype','single','Format','classic');
      ncwrite(ncname,'a2x3h_Sa_tbot',tbot_assign)
      write_netcdf_att(ncname,'a2x3h_Sa_tbot',single(1.e30),'K','Temperature at the lowest model level', ...
                       'air_temperature','a2x3h','time: mean')

      nccreate(ncname,'a2x3h_Sa_ptem','Dimensions',{'a2x3h_nx',1,'a2x3h_ny',1,'time',Inf},'Datatype','single','Format','classic');
      ncwrite(ncname,'a2x3h_Sa_ptem',ptem_assign)
      write_netcdf_att(ncname,'a2x3h_Sa_ptem',single(1.e30),'K','Potential temperature at the lowest model level', ...
                       'air_potential_temperature','a2x3h','time: mean')

      nccreate(ncname,'a2x3h_Sa_shum','Dimensions',{'a2x3h_nx',1,'a2x3h_ny',1,'time',Inf},'Datatype','single','Format','classic');
      ncwrite(ncname,'a2x3h_Sa_shum',shum_assign)
      write_netcdf_att(ncname,'a2x3h_Sa_shum',single(1.e30),'kg kg-1','Specific humidity at the lowest model level', ...
                       'specific humidity','a2x3h','time: mean')

      nccreate(ncname,'a2x3h_Sa_dens','Dimensions',{'a2x3h_nx',1,'a2x3h_ny',1,'time',Inf},'Datatype','single','Format','classic');
      ncwrite(ncname,'a2x3h_Sa_dens',dens_assign)
      write_netcdf_att(ncname,'a2x3h_Sa_dens',single(1.e30),'kg m-3','Density at the lowest model level', ...
                       'air_density','a2x3h','time: mean')

      nccreate(ncname,'a2x3h_Sa_pbot','Dimensions',{'a2x3h_nx',1,'a2x3h_ny',1,'time',Inf},'Datatype','single','Format','classic');
      ncwrite(ncname,'a2x3h_Sa_pbot',pbot_assign)
      write_netcdf_att(ncname,'a2x3h_Sa_pbot',single(1.e30),'Pa','Pressure at the lowest model level', ...
                       'air_pressure','a2x3h','time: mean')

      nccreate(ncname,'a2x3h_Sa_pslv','Dimensions',{'a2x3h_nx',1,'a2x3h_ny',1,'time',Inf},'Datatype','single','Format','classic');
      ncwrite(ncname,'a2x3h_Sa_pslv',pslv_assign)
      write_netcdf_att(ncname,'a2x3h_Sa_pslv',single(1.e30),'Pa','Sea level pressure','air_pressure_at_sea_level', ...
                       'a2x3h','time: mean')

      nccreate(ncname,'a2x3h_Faxa_lwdn','Dimensions',{'a2x3h_nx',1,'a2x3h_ny',1,'time',Inf},'Datatype','single','Format','classic');
      ncwrite(ncname,'a2x3h_Faxa_lwdn',lwdn_assign)
      write_netcdf_att(ncname,'a2x3h_Faxa_lwdn',single(1.e30),'W m-2','Downward longwave heat flux', ...
                       'downwelling_longwave_flux','a2x3h','time: mean')

      nccreate(ncname,'a2x3h_Faxa_rainc','Dimensions',{'a2x3h_nx',1,'a2x3h_ny',1,'time',Inf},'Datatype','single','Format','classic');
      ncwrite(ncname,'a2x3h_Faxa_rainc',rainc_assign)
      write_netcdf_att(ncname,'a2x3h_Faxa_rainc',single(1.e30),'kg m-2 s-1','Convective precipitation rate', ...
                       'convective_precipitation_flux','a2x3h','time: mean')

      nccreate(ncname,'a2x3h_Faxa_rainl','Dimensions',{'a2x3h_nx',1,'a2x3h_ny',1,'time',Inf},'Datatype','single','Format','classic');
      ncwrite(ncname,'a2x3h_Faxa_rainl',rainl_assign)
      write_netcdf_att(ncname,'a2x3h_Faxa_rainl',single(1.e30),'kg m-2 s-1','Large-scale (stable) precipitation rate', ...
                       'large_scale_precipitation_flux','a2x3h','time: mean')

      nccreate(ncname,'a2x3h_Faxa_snowc','Dimensions',{'a2x3h_nx',1,'a2x3h_ny',1,'time',Inf},'Datatype','single','Format','classic');
      ncwrite(ncname,'a2x3h_Faxa_snowc',snowc_assign)
      write_netcdf_att(ncname,'a2x3h_Faxa_snowc',single(1.e30),'kg m-2 s-1','Convective snow rate (water equivalent)', ...
                       'convective_snowfall_flux','a2x3h','time: mean')

      nccreate(ncname,'a2x3h_Faxa_snowl','Dimensions',{'a2x3h_nx',1,'a2x3h_ny',1,'time',Inf},'Datatype','single','Format','classic');
      ncwrite(ncname,'a2x3h_Faxa_snowl',snowl_assign)
      write_netcdf_att(ncname,'a2x3h_Faxa_snowl',single(1.e30),'kg m-2 s-1','Large-scale (stable) snow rate (water equivalent)', ...
                       'large_scale_snowfall_flux','a2x3h','time: mean')

      ncwriteatt(ncname,'/','creation_method', 'Scaling CAM6 regional product to tower site level met')
      ncwriteatt(ncname,'/','creation_date', datestr(now))
      ncwriteatt(ncname,'/','author', 'Brett Raczka, bmraczka@ucar.edu') 

 

      % Write 1 hour file
      ncname=[path_scaled_CAM enstr{jj} '/CAM6_NR1.cpl_' enstr{jj} '.ha2x1h.' yearstr{ii} '.nc'];
      ncid=netcdf.create(ncname,'CLOBBER');
      netcdf.close(ncid);
      nccreate(ncname,'time','Dimensions',{'time',Inf},'Format','classic');
      ncwrite(ncname,'time',time_1hr)
          if str2num(yearstr{ii})==2011
             ncwriteatt(ncname,'time','units',['days since 2010-07-01 00:00:00'])
          else
             ncwriteatt(ncname,'time','units',['days since 2011-01-01 00:00:00'])
          end
      ncwriteatt(ncname,'time','calendar','gregorian')
      ncwriteatt(ncname,'time','bounds','time_bnds')
      ncwriteatt(ncname,'time','cell_methods','time: mean')

      nccreate(ncname,'time_bnds','Dimensions',{'ntb',2,'time',Inf},'Format','classic');
      ncwrite(ncname,'time_bnds',time_bnds_1hr)
      ncwriteatt(ncname,'time_bnds','cell_methods','time: mean')

      nccreate(ncname,'doma_lat','Dimensions',{'doma_nx',1,'doma_ny',1},'Format','classic');
      ncwrite(ncname,'doma_lat',SITE_lat)
      write_netcdf_att(ncname,'doma_lat',0.,'degrees north','latitude','latitude','doma')        

      nccreate(ncname,'doma_lon','Dimensions',{'doma_nx',1,'doma_ny',1},'Format','classic');
      ncwrite(ncname,'doma_lon',SITE_lon)
      write_netcdf_att(ncname,'doma_lon',0.,'degrees east','longitude','longitude','doma')   

      nccreate(ncname,'doma_area','Dimensions',{'doma_nx',1,'doma_ny',1},'Format','classic');
      ncwrite(ncname,'doma_area',SITE_doma_area)
      write_netcdf_att(ncname,'doma_area',0.,'radian^2','cell_area_model','cell area from model','doma')   

      nccreate(ncname,'a2x1h_Sa_u','Dimensions',{'a2x1h_nx',1,'a2x1h_ny',1,'time',Inf},'Datatype','single','Format','classic');
      ncwrite(ncname,'a2x1h_Sa_u',u_assign)
      write_netcdf_att(ncname,'a2x1h_Sa_u',single(1.e30),'m s-1','Zonal wind at the lowest model level', ...
                       'eastward_wind','a2x1h','time: mean')   

      nccreate(ncname,'doma_aream','Dimensions',{'doma_nx',1,'doma_ny',1},'Format','classic');
      ncwrite(ncname,'doma_aream',SITE_doma_aream)
      write_netcdf_att(ncname,'doma_aream',0.,'radian^2','cell_area_mapping','cell area from mapping file','doma')

      nccreate(ncname,'doma_mask','Dimensions',{'doma_nx',1,'doma_ny',1},'Format','classic');
      ncwrite(ncname,'doma_mask',SITE_doma_mask)
      write_netcdf_att(ncname,'doma_mask',0.,'1','mask','mask','doma')

      nccreate(ncname,'doma_frac','Dimensions',{'doma_nx',1,'doma_ny',1},'Format','classic');
      ncwrite(ncname,'doma_frac',SITE_doma_frac)
      write_netcdf_att(ncname,'doma_frac',0.,'1','area_fraction','area fraction','doma')

      nccreate(ncname,'a2x1h_Sa_v','Dimensions',{'a2x1h_nx',1,'a2x1h_ny',1,'time',Inf},'Datatype','single','Format','classic');
      ncwrite(ncname,'a2x1h_Sa_v',v_assign)
      write_netcdf_att(ncname,'a2x1h_Sa_v',single(1.e30),'m s-1','Meridional wind at the lowest model level', ...
                       'northward_wind','a2x1h','time: mean')
        
      ncwriteatt(ncname,'/','creation_method', 'Scaling CAM6 regional product to tower site level met')
      ncwriteatt(ncname,'/','creation_date', datestr(now))
      ncwriteatt(ncname,'/','author', 'Brett Raczka, bmraczka@ucar.edu')
       
      
    end % Ensemble assignment loop  

    % Important to clear the CAM6 file variables because leap year makes file size inconsistent

    clear Faxa_swndr Faxa_swvdr Faxa_swndf Faxa_swvdf Faxa_rainc Faxa_rainl Faxa_snowc Faxa_snowl 
    clear  Sa_u Sa_v Sa_tbot Sa_shum Sa_pbot Faxa_lwdn Sa_z Sa_ptem Sa_dens Sa_pslv Sa_topo 

  end   % Main Loop
