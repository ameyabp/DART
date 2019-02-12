! This code is not protected by the DART copyright agreement.
! DART $Id$

! adapted from original JPL, now GSFC/NASA code, example AIRS readers

module rttov_interface_mod

use     location_mod,  only : location_type, set_location, get_location, VERTISUNDEF, &
                              VERTISHEIGHT, VERTISLEVEL, set_location_missing, &
                              is_vertical, &
                              VERTISHEIGHT

use    utilities_mod,  only : register_module, error_handler, E_ERR, &
                              nmlfileunit, check_namelist_read,      &
                              find_namelist_in_file, do_nml_file, do_nml_term, &
                              ascii_file_format

! example call to the forward operator for radiances.
! needs rttov libs, include files.
! needs to be preprocessed.

! Description:
!> @file
!!   Example calling direct model clear-sky simulation.
!
!> @brief
!!   Example calling direct model clear-sky simulation.
!!
!! @details
!!   This example is most easily run using the run_example_fwd.sh
!!   script (see the user guide).
!!
!!   This program requires the following files:
!!     the file containing input profiles (e.g. prof.dat)
!!     the RTTOV optical depth coefficient file
!!
!!   The output is written to a file called example_fwd_output.dat
!!
!!   This program demonstrates the most simple kind of RTTOV simulation.
!!
!!   You may wish to base your own code on this example in which case you
!!   should edit in particular the sections of code marked as follows:
!!       !================================
!!       !======Read =====start===========
!!            code to be modified
!!       !======Read ===== end ===========
!!       !================================
!!
!
! Copyright:
!    This software was developed within the context of
!    the EUMETSAT Satellite Application Facility on
!    Numerical Weather Prediction (NWP SAF), under the
!    Cooperation Agreement dated 25 November 1998, between
!    EUMETSAT and the Met Office, UK, by one or more partners
!    within the NWP SAF. The partners in the NWP SAF are
!    the Met Office, ECMWF, KNMI and MeteoFrance.
!
!    Copyright 2017, EUMETSAT, All Rights Reserved.
!

  use types_mod, only : r8

  ! rttov_const contains useful RTTOV constants
  USE rttov_const, ONLY :     &
         errorstatus_success, &
         errorstatus_fatal,   &
         platform_name,       &
         inst_name,           &
         pmax,                &
         pmin

  ! rttov_types contains definitions of all RTTOV data types
  USE rttov_types, ONLY :     &
         rttov_options,       &
         rttov_coefs,         &
         rttov_profile,       &
         rttov_transmission,  &
         rttov_radiance,      &
         rttov_chanprof,      &
         rttov_emissivity,    &
         rttov_reflectance

  ! jpim, jprb and jplm are the RTTOV integer, real and logical KINDs
  USE parkind1, ONLY : jpim, jprb, jplm
  ! are these I4, R8, ?  what's a logical kind?
  !
  ! (JPH) INTEGER, PARAMETER :: JPIM = SELECTED_INT_KIND(9) !< Standard integer type
  ! (JPH) INTEGER, PARAMETER :: JPRB = SELECTED_REAL_KIND(13,300) !< Standard real type
  ! (JPH) INTEGER, PARAMETER :: JPLM = KIND(.TRUE.)               !< Standard logical type
  IMPLICIT NONE

#include "rttov_direct.interface"
#include "rttov_parallel_direct.interface"
#include "rttov_read_coefs.interface"
#include "rttov_dealloc_coefs.interface"
#include "rttov_alloc_direct.interface"
#include "rttov_user_options_checkinput.interface"
#include "rttov_print_opts.interface"
#include "rttov_print_profile.interface"

  !--------------------------
  !
  INTEGER(KIND=jpim), PARAMETER :: ioout = 0    ! stdout for now

!FIXME: this is in module global storage for now
! should be what?  passed in and out?  allocated in
! the setup and returned?  larger single structure
! to collect these together in a single (opaque) type?

  ! RTTOV variables/structures
  !====================
  TYPE(rttov_options)              :: opts                     ! Options structure
  TYPE(rttov_coefs)                :: coefs                    ! Coefficients structure
  TYPE(rttov_chanprof),    POINTER :: chanprof(:)    => NULL() ! Input channel/profile list
  LOGICAL(KIND=jplm),      POINTER :: calcemis(:)    => NULL() ! Flag to indicate calculation of emissivity within RTTOV
  TYPE(rttov_emissivity),  POINTER :: emissivity(:)  => NULL() ! Input/output surface emissivity
  LOGICAL(KIND=jplm),      POINTER :: calcrefl(:)    => NULL() ! Flag to indicate calculation of BRDF within RTTOV
  TYPE(rttov_reflectance), POINTER :: reflectance(:) => NULL() ! Input/output surface BRDF
  TYPE(rttov_profile),     POINTER :: profiles(:)    => NULL() ! Input profiles
  TYPE(rttov_transmission)         :: transmission             ! Output transmittances
  TYPE(rttov_radiance)             :: radiance                 ! Output radiances

  INTEGER(KIND=jpim)               :: errorstatus              ! Return error status of RTTOV subroutine calls

  INTEGER(KIND=jpim) :: alloc_status
  CHARACTER(LEN=*), parameter  :: NameOfRoutine = 'rttov_interfaces'   !FIXME unused

  ! variables for input
  !====================
  CHARACTER(LEN=256) :: coef_filename
  CHARACTER(LEN=256) :: prof_filename
  INTEGER(KIND=jpim) :: nthreads = 1
  INTEGER(KIND=jpim) :: dosolar = 0
  INTEGER(KIND=jpim) :: nlevels
  INTEGER(KIND=jpim) :: nprof
  INTEGER(KIND=jpim) :: nchannels
  INTEGER(KIND=jpim) :: nchanprof

  ! These are now namelist variables in obs_def_rttov
  INTEGER(KIND=jpim), ALLOCATABLE :: channel_list(:)

  REAL(KIND=jprb)    :: trans_out(10)
  ! loop variables
  INTEGER(KIND=jpim) :: j, jch
  INTEGER(KIND=jpim) :: np, nch
  INTEGER(KIND=jpim) :: ilev, nprint
  INTEGER(KIND=jpim) :: iprof, joff
  INTEGER            :: ios

  !- End of header --------------------------------------------------------

  ! The usual steps to take when running RTTOV are as follows:
  !   1. Specify required RTTOV options
  !   2. Read coefficients
  !   3. Allocate RTTOV input and output structures
  !   4. Set up the chanprof array with the channels/profiles to simulate
  !   5. Read input profile(s) [[ get these from the model ]]
  !   6. Set up surface emissivity and/or reflectance
  !   7. Call rttov_direct and store results
  !   8. Deallocate all structures and arrays

  ! If nthreads is greater than 1 the parallel RTTOV interface is used.
  ! To take advantage of multi-threaded execution you must have compiled
  ! RTTOV with openmp enabled. See the user guide and the compiler flags.

public :: dart_rttov_setup, &
          dart_rttov_do_forward_model, &
          dart_rttov_takedown


contains

  !=====================================================
  !========== Interactive inputs == start ==============

!--------------------------------------------------------------------------
!
!FIXME the channels are in the obs metadata, and nlevels are
! model (and model configuration) dependent.  it seems most
! efficient to list all expected channels and the number
! of model levels for now in a namelist so we can do all the
! set up once at init time, rather than on demand.  this decision
! can be changed once we get this working.


subroutine dart_rttov_setup(coef_file, prof_file, nprofs, nlevs, &
                            nchans, chan_list, error_status)

character(len=256), intent(in)  :: coef_file
character(len=256), intent(in)  :: prof_file
integer,   intent(in)  :: nprofs
integer,   intent(in)  :: nlevs
integer,   intent(in)  :: nchans
integer,   intent(in)  :: chan_list(nchans)
integer,   intent(out) :: error_status  ! 0 is good, anything else is bad

!FIXME: things we need to set.
!  coef_filename comes from the rttov distribution
!  the profile comes from our forward operators
!  for now, number of profiles is 1
!  number of profile levels equals the number of model levels
!  no solar
!  pick 1 channel (need advice on this) - will be in obs in metadata
!  channel number is part of metadata
!  number of threads is 1 for now

coef_filename = coef_file
prof_filename = prof_file
nlevels       = nlevs
nprof         = nprofs
nchannels     = nchans

! --------------------------------------------------------------------------
! 1. Initialise RTTOV options structure
! --------------------------------------------------------------------------

IF (dosolar == 1) THEN
  opts % rt_ir % addsolar = .TRUE.           ! Include solar radiation
ELSE
  opts % rt_ir % addsolar = .FALSE.          ! Do not include solar radiation
ENDIF
opts % interpolation % addinterp   = .TRUE.  ! Allow interpolation of input profile
opts % interpolation % interp_mode = 1       ! Set interpolation method
! (JPH) : interp_mode 1 = Rachon     on optical depths
! (JPH) : interp_mode 2 = Log-linear on optical depths
! (JPH) : interp_mode 3 = Log-linear on optical depths
! (JPH) : interp_mode 4 = Rachon     on weighting function
! (JPH) : interp_mode 5 = Log-linear on weighting function
opts % rt_all % addrefrac          = .TRUE.  ! Include refraction in path calc
opts % rt_ir % addclouds           = .FALSE. ! Don't include cloud effects
opts % rt_ir % addaerosl           = .FALSE. ! Don't include aerosol effects

opts % rt_ir % ozone_data          = .FALSE. ! Set the relevant flag to .TRUE.
opts % rt_ir % co2_data            = .FALSE. !   when supplying a profile of the
opts % rt_ir % n2o_data            = .FALSE. !   given trace gas (ensure the
opts % rt_ir % ch4_data            = .FALSE. !   coef file supports the gas)
opts % rt_ir % co_data             = .FALSE. !
opts % rt_ir % so2_data            = .FALSE. !
opts % rt_mw % clw_data            = .FALSE. !

opts % config % verbose            = .TRUE.  ! Enable printing of warnings

! --------------------------------------------------------------------------
! 2. Read coefficients
! --------------------------------------------------------------------------
CALL rttov_read_coefs(errorstatus, coefs, opts, file_coef=coef_filename)
IF (errorstatus /= errorstatus_success) THEN
  WRITE(*,*) 'fatal error reading coefficients'
  error_status = errorstatus
  return
ENDIF

! Ensure input number of channels is not higher than number stored in coefficient file
IF (nchannels > coefs % coef % fmv_chn) THEN
  WRITE(*,*) 'n requested channels too large'
  error_status = errorstatus_fatal
  return
ENDIF

! Ensure the options and coefficients are consistent
print*, 'dart_rttov_setup::rttov_user_options_checkinput'
CALL rttov_user_options_checkinput(errorstatus, opts, coefs)
IF (errorstatus /= errorstatus_success) THEN
  WRITE(*,*) 'error in rttov options'
  error_status = errorstatus
  return
ENDIF


! --------------------------------------------------------------------------
! 3. Allocate RTTOV input and output structures
! --------------------------------------------------------------------------

! Determine the total number of radiances to simulate (nchanprof).
! In this example we simulate all specified channels for each profile, but
! in general one can simulate a different number of channels for each profile.

nchanprof = nchannels * nprof
! Allocate structures for rttov_direct
CALL rttov_alloc_direct( &
      errorstatus,             &
      1_jpim,                  &  ! 1 => allocate
      nprof,                   &
      nchanprof,               &
      nlevels,                 &
      chanprof,                &
      opts,                    &
      profiles,                &
      coefs,                   &
      transmission,            &
      radiance,                &
      calcemis=calcemis,       &
      emissivity=emissivity,   &
      calcrefl=calcrefl,       &
      reflectance=reflectance, &
      init=.TRUE._jplm)

IF (errorstatus /= errorstatus_success) THEN
  WRITE(*,*) 'allocation error for rttov_direct structures'
  error_status = errorstatus
  return
ENDIF


! --------------------------------------------------------------------------
! 4. Build the list of profile/channel indices in chanprof
! --------------------------------------------------------------------------

nch = 0_jpim
DO j = 1, nprof
  DO jch = 1, nchannels
    nch = nch + 1_jpim
    chanprof(nch)%prof = j
    chanprof(nch)%chan = chan_list(jch)
  ENDDO
ENDDO

!call dart_rttov_dump_results(nprof, nchannels)

end subroutine dart_rttov_setup

!--------------------------------------------------------------------------

! --------------------------------------------------------------------------
! 5. Read profile data
! FIXME:  HERE WE use the profiles from our FORWARD OPERATOR calls
! --------------------------------------------------------------------------

subroutine dart_rttov_do_forward_model(ens_size, nlevels, location, t, p, q, u, v, wvmr, radiances, error_status)
integer,             intent(in)  :: ens_size
integer,             intent(in)  :: nlevels
type(location_type), intent(in)  :: location
real(r8),            intent(in)  :: t(ens_size,nlevels)
real(r8),            intent(in)  :: p(ens_size,nlevels)
real(r8),            intent(in)  :: q(ens_size,nlevels)
real(r8),            intent(in)  :: u(ens_size,nlevels)
real(r8),            intent(in)  :: v(ens_size,nlevels)
real(r8),            intent(in)  :: wvmr(ens_size,nlevels)
real(r8),            intent(out) :: radiances(ens_size)
integer,             intent(out) :: error_status(ens_size)

! for now, hardcode the number of profiles to
! one at a time.  revisit this later.
integer :: nprof = 1
integer :: imem, iprof

! observation location variables
real(r8) :: lon, lat, height, obsloc(3)

!real(r8) :: sat_az, sat_ze, sun_az, sun_ze
!integer  :: platform, sat_id, sensor
!integer  :: key = 1

obsloc   = get_location(location)

!FIXME -  check that the units are the same
lon      = obsloc(1) ! degree: 0 to 360
lat      = obsloc(2) ! degree: -90 to 90
height   = obsloc(3) ! (m)

if ( .not. is_vertical(location, "HEIGHT")) then
   write(*, *) 'vertical location must be height;'
endif


! --------------------------------------------------------------------------
! 5. Set profile data
! --------------------------------------------------------------------------

! Read gas units for profiles
!
! Gas units (must be same for all profiles)
! 0 => ppmv over dry air
! 1 => kg/kg over moist air
! 2 => ppmv over moist air
!
!FIXME - units for moisture, apparently ppmv or kg/kg
profiles(1) % gas_units = 1 ! 1 = kg/kg (confirmed)

! Loop over all of the ensemble members
DO imem = 1, ens_size

   ! Loop over all profiles and read data for each one
   DO iprof = 1, nprof
   
     ! Assign pressure (hPa), temp (K), WV, O3 (gas units ppmv or kg/kg)
     profiles(iprof) % p(:) = p(imem,nlevels:1:-1)/100  ! WRF has units of pressure in Pa
     profiles(iprof) % t(:) = t(imem,nlevels:1:-1)      ! FIXME : need to confirm on cell centers
     profiles(iprof) % q(:) = q(imem,nlevels:1:-1) ! WRF has units of kg/kg
   
     print*, 'p = ', profiles(iprof) % p(1), '...', profiles(iprof) % p(nlevels)
     print*, 't = ', profiles(iprof) % t(1), '...', profiles(iprof) % t(nlevels)
     print*, 'q = ', profiles(iprof) % q(1), '...', profiles(iprof) % q(nlevels)
   
!FIXME - some models have surface t/q/p which are 2m

     ! 2 meter air variables
     ! but typically winds are 10m, and wind fetch isn't available.
     !
     ! Near-surface variables:
     !  2m T (K)    2m q (ppmv) 2m p (hPa) 10m wind u (m/s)  10m wind v (m/s)  wind fetch (m)
     !
     !   286.6682    15248.0550  1007.30      5.000             2.0000            100000.
     profiles(iprof) % s2m % t     = t(imem,1)
     profiles(iprof) % s2m % q     = q(imem,1)
     profiles(iprof) % s2m % p     = p(imem,1)/100 ! 400 hPa < surface pressure < 1100hPa
     profiles(iprof) % s2m % u     = u(imem,1)
     profiles(iprof) % s2m % v     = v(imem,1)
     profiles(iprof) % s2m % wfetc = 100000.0   ! wfetc(1,1)
     
     print*, 'profiles(iprof) % s2m % t     = ', profiles(iprof) % s2m % t     
     print*, 'profiles(iprof) % s2m % q     = ', profiles(iprof) % s2m % q     
     print*, 'profiles(iprof) % s2m % p     = ', profiles(iprof) % s2m % p     
     print*, 'profiles(iprof) % s2m % u     = ', profiles(iprof) % s2m % u     
     print*, 'profiles(iprof) % s2m % v     = ', profiles(iprof) % s2m % v     
     print*, 'profiles(iprof) % s2m % wfetc = ', profiles(iprof) % s2m % wfetc 
   
!FIXME - some models have surface t/q/p which are 2m
! but typically winds are 10m, and wind fetch isn't available.

     ! Skin variables:
     !  Skin T (K)  Salinity   FASTEM parameters for land surfaces
     !
     !  286.6682    35.0       3.0 5.0 15.0 0.1 0.3
       profiles(iprof) % skin % t        = 286.6682
       profiles(iprof) % skin % salinity =  35.0! Salinity only applies to FASTEM over sea
       profiles(iprof) % skin % fastem   =   3.0! FASTEM only applies to MW instruments
   
! FIXME - don't have, in general
! only interpolate if all 4 boxes are over land

       ! Surface type and water type
       !
       ! Surface type (0=land, 1=sea, 2=sea-ice) and water type (0=fresh, 1=ocean)
       !
       !  1         1
       profiles(iprof) % skin % surftype  = 1
       profiles(iprof) % skin % watertype = 1
   
!FIXME - ok, these we understand.  verify elevation is in meters (km?)
! (JPH) : pg.11 users_guide_rttov12_v1.2.pdf profiles(i)%elevation [km]

       ! Elevation, latitude and longitude
       !
       ! Elevation (km), latitude and longitude (degrees)
       !
       !  0.    0.   30.
       profiles(iprof) % elevation = height
       profiles(iprof) % latitude  = lat
       profiles(iprof) % longitude = lon
   
!FIXME - these will be part of metadata.  note we generally
! have used azimuth/elevation instead of azimuth/zenith.

       ! Satellite and solar angles
       ! elevation = 90 - zenith, and zenith = 90 - elevation.
       !
       ! Sat. zenith and azimuth angles, solar zenith and azimuth angles (degrees)
       !
       !  0.     0.     45.     30.
!#! CALL get_rttov_metadata(key, sat_az, sat_ze, sun_az, sun_ze, platform, sat_id, sensor, channel)
!#! write(*, *) 'sat_az, sat_ze, sun_az, sun_ze', sat_az, sat_ze, sun_az, sun_ze
!#! write(*, *) 'platform, sat_id, sensor, channel', platform, sat_id, sensor, channel
!#! write(*, *) 'key', key
       profiles(iprof) % zenangle    =  0.0
       profiles(iprof) % azangle     =  0.0
       profiles(iprof) % sunzenangle = 45.0
       profiles(iprof) % sunazangle  = 30.0
   
!FIXME - make sure cfraction is 0 here

       ! Cloud variables for simple cloud scheme, set cfraction to 0. to turn this off (VIS/IR only)
       !
       ! Cloud top pressure (hPa) and cloud fraction for simple cloud scheme
       !
       !  500.00    0.0
       profiles(iprof) % ctp       = 500.0
       profiles(iprof) % cfraction =   0.0
   
     ENDDO ! profile data

! --------------------------------------------------------------------------
! 6. Specify surface emissivity and reflectance
! --------------------------------------------------------------------------

! In this example we have no values for input emissivities
emissivity(:) % emis_in = 0._jprb

! Calculate emissivity within RTTOV where the input emissivity value is
! zero or less (all channels in this case)
calcemis(:) = (emissivity(:) % emis_in <= 0._jprb)

! In this example we have no values for input reflectances
reflectance(:) % refl_in = 0._jprb

! Calculate BRDF within RTTOV where the input BRDF value is zero or less
! (all channels in this case)
calcrefl(:) = (reflectance(:) % refl_in <= 0._jprb)

! Use default cloud top BRDF for simple cloud in VIS/NIR channels
reflectance(:) % refl_cloud_top = 0._jprb


! --------------------------------------------------------------------------
! 7. Call RTTOV forward model
! --------------------------------------------------------------------------
CALL rttov_direct(                &
        errorstatus,              &! out   error flag
        chanprof,                 &! in    channel and profile index structure
        opts,                     &! in    options structure
        profiles,                 &! in    profile array
        coefs,                    &! in    coefficients structure
        transmission,             &! inout computed transmittances
        radiance,                 &! inout computed radiances
        calcemis    = calcemis,   &! in    flag for internal emissivity calcs
        emissivity  = emissivity, &! inout input/output emissivities per channel
        calcrefl    = calcrefl,   &! in    flag for internal BRDF calcs
        reflectance = reflectance) ! inout input/output BRDFs per channel

IF (errorstatus /= errorstatus_success) THEN
  WRITE (*,*) 'rttov_direct error'
  !CALL rttov_exit(errorstatus)
ENDIF

!FIXME - what do we want to use as an index to total()
radiances(imem) = radiance % total(1)
ENDDO ! member loop

print*, 'RADIANCE % TOTAL = ', radiance % total(:)

IF (errorstatus /= errorstatus_success) THEN
  WRITE (*,*) 'rttov_direct error'
  !CALL rttov_exit(errorstatus)
ENDIF

!============== Output results == end ==============
!=====================================================

print*, 'dart_rttov_dump_results'
call dart_rttov_dump_results(nprof, nchannels)


end subroutine dart_rttov_do_forward_model

!--------------------------------------------------------------------------

subroutine dart_rttov_dump_results(nprof, nchannels)
integer, intent(in) :: nprof
integer, intent(in) :: nchannels

!=====================================================
!============== Output results == start ==============

! Open output file where results are written

WRITE(ioout,*)' -----------------'
WRITE(ioout,*)' Instrument ', inst_name(coefs % coef % id_inst)
WRITE(ioout,*)' -----------------'
WRITE(ioout,*)' '
CALL rttov_print_opts(opts, lu=ioout)

DO iprof = 1, nprof

  joff = (iprof-1_jpim) * nchannels

  nprint = 1 + INT((nchannels-1)/10)
  WRITE(ioout,*)' '
  WRITE(ioout,*)' Profile ', iprof

  CALL rttov_print_profile(profiles(iprof), lu=ioout)

  WRITE(ioout,777)'CHANNELS PROCESSED FOR SAT ', platform_name(coefs % coef % id_platform), coefs % coef % id_sat
  WRITE(ioout,111) (chanprof(j) % chan, j = 1+joff, nchannels+joff)
  WRITE(ioout,*)' '
  WRITE(ioout,*)'CALCULATED BRIGHTNESS TEMPERATURES (K):'
  WRITE(ioout,222) (radiance % bt(j), j = 1+joff, nchannels+joff)
  IF (opts % rt_ir % addsolar) THEN
    WRITE(ioout,*)' '
    WRITE(ioout,*)'CALCULATED SATELLITE REFLECTANCES (BRF):'
    WRITE(ioout,444) (radiance % refl(j), j = 1+joff, nchannels+joff)
  ENDIF
  WRITE(ioout,*)' '
  WRITE(ioout,*)'CALCULATED RADIANCES (mW/m2/sr/cm-1):'
  WRITE(ioout,222) (radiance % total(j), j = 1+joff, nchannels+joff)
  WRITE(ioout,*)' '
  WRITE(ioout,*)'CALCULATED OVERCAST RADIANCES:'
  WRITE(ioout,222) (radiance % cloudy(j), j = 1+joff, nchannels+joff)
  WRITE(ioout,*)' '
  WRITE(ioout,*)'CALCULATED SURFACE TO SPACE TRANSMITTANCE:'
  WRITE(ioout,4444) (transmission % tau_total(j), j = 1+joff, nchannels+joff)
  WRITE(ioout,*)' '
  WRITE(ioout,*)'CALCULATED SURFACE EMISSIVITIES:'
  WRITE(ioout,444) (emissivity(j) % emis_out, j = 1+joff, nchannels+joff)
  IF (opts % rt_ir % addsolar) THEN
    WRITE(ioout,*)' '
    WRITE(ioout,*)'CALCULATED SURFACE BRDF:'
    WRITE(ioout,444) (reflectance(j) % refl_out, j = 1+joff, nchannels+joff)
  ENDIF

  IF (nchannels <= 20) THEN
    DO np = 1, nprint
        WRITE(ioout,*)' '
        WRITE(ioout,*)'Level to space transmittances for channels'
        WRITE(ioout,1115) (chanprof(j+joff) % chan, &
                  j = 1+(np-1)*10, MIN(np*10, nchannels))
        DO ilev = 1, nlevels
          DO j = 1 + (np-1)*10, MIN(np*10, nchannels)
            ! Select transmittance based on channel type (VIS/NIR or IR)
            IF (coefs % coef % ss_val_chn(chanprof(j+joff) % chan) == 2) THEN
              trans_out(j - (np-1)*10) = transmission % tausun_levels_path1(ilev,j+joff)
            ELSE
              trans_out(j - (np-1)*10) = transmission % tau_levels(ilev,j+joff)
            ENDIF
          ENDDO
          WRITE(ioout,4445) ilev, trans_out(1:j-1-(np-1)*10)
        ENDDO
        WRITE(ioout,1115) (chanprof(j+joff) % chan, &
                  j = 1+(np-1)*10, MIN(np*10, nchannels))
    ENDDO
  ENDIF
ENDDO

!============== Output results == end ==============
!=====================================================

! Format definitions for output
111  FORMAT(1X,10I8)
1115 FORMAT(3X,10I8)
222  FORMAT(1X,10F8.2)
444  FORMAT(1X,10F8.3)
4444 FORMAT(1X,10F8.4)
4445 FORMAT(1X,I2,10F8.4)
777  FORMAT(/,A,A9,I3)

end subroutine dart_rttov_dump_results

!--------------------------------------------------------------------------

subroutine dart_rttov_takedown(error_status)
integer, intent(out) :: error_status

integer :: alloc_status

!FIXME - in the forward operator code we won't be deallocating
! this structure.

! initialize error status tp success
error_status = errorstatus_success

! --------------------------------------------------------------------------
! 8. Deallocate all RTTOV arrays and structures
! --------------------------------------------------------------------------
DEALLOCATE (channel_list, stat=alloc_status)
IF (alloc_status /= 0) THEN
  WRITE(*,*) 'mem dellocation error'
ENDIF

! Deallocate structures for rttov_direct
print*, 'dart_rttov_takedown::rttov_alloc_direct'
CALL rttov_alloc_direct( &
      errorstatus,             &
      0_jpim,                  &  ! 0 => deallocate
      nprof,                   &
      nchanprof,               &
      nlevels,                 &
      chanprof,                &
      opts,                    &
      profiles,                &
      coefs,                   &
      transmission,            &
      radiance,                &
      calcemis=calcemis,       &
      emissivity=emissivity,   &
      calcrefl=calcrefl,       &
      reflectance=reflectance)

IF (errorstatus /= errorstatus_success) THEN
  WRITE(*,*) 'deallocation error for rttov_direct structures'
  error_status = errorstatus
  return
ENDIF

CALL rttov_dealloc_coefs(errorstatus, coefs)
IF (errorstatus /= errorstatus_success) THEN
  WRITE(*,*) 'coefs deallocation error'
ENDIF

end subroutine dart_rttov_takedown

!--------------------------------------------------------------------------

end module rttov_interface_mod
