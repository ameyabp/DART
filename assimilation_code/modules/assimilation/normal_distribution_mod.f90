! DART software - Copyright UCAR. This open source software is provided
! by UCAR, "as is", without charge, subject to all terms of use at
! http://www.image.ucar.edu/DAReS/DART/DART_download

module normal_distribution_mod

use types_mod, only : r8, digits12, PI

use utilities_mod, only : E_ERR, E_MSG, error_handler

implicit none
private

public :: norm_cdf, norm_inv, weighted_norm_inv, test_normal

character(len=512)        :: errstring
character(len=*), parameter :: source = 'normal_distribution_mod.f90'

! These quantiles bracket the range over which norm_inv functions
! The test routines are confined to this range and values outside this are
! changed to these. Approximate correpsonding standard deviations are in 
! min_sd and max_sd and these are the range over which the test_normal functions.
! The max_sd is smaller in magnitude than the min_sd because the Fortran number
! model cannot represent numbers as close to 1 as it can to 0.
real(r8), parameter :: min_quantile = 5.0d-198,  max_quantile = 0.999999999999999_r8
real(r8), parameter :: min_sd = -30.0_r8, max_sd = 8.0_r8

contains 

!------------------------------------------------------------------------

subroutine test_normal

! This routine provides limited tests of the numerics in this module. It begins
! by comparing a handful of cases of the cdf to results from Matlab. It
! then tests the quality of the inverse cdf for a single mean/sd. Failing
! these tests suggests a serious problem. Passing them does not indicate that 
! there are acceptable results for all possible inputs. 

! Set number of equally spaced trials for the test F-1(F(x)) where F is the CDF.
integer, parameter :: num_trials = 10000000

integer  :: i, j
real(r8) :: sd, quantile, inv, max_diff(16), max_q(16), max_matlab_diff

! Comparative results for a handful of cases from MATLAB21a
real(r8) :: cdf_diff(7)
real(r8) :: mmean(7) = [0.0_r8, 1.0_r8, -1.0_r8, 0.0_r8, 0.0_r8, 0.0_r8, 0.5_r8]
real(r8) :: msd(7) = [0.5_r8, 1.0_r8, 2.0_r8, 4.0_r8, 5.0_r8, 6.0_r8, 0.25_r8]
real(r8) :: mx(7)     = [0.1_r8, 0.2_r8, 0.3_r8, 0.4_r8, 0.5_r8, 0.6_r8, 0.7_r8]
! Generated by matlab normcdf(mx, mmean, msd)
real(r8) :: mcdf(7) = [0.579259709439103_r8, 0.211855398583397_r8, 0.742153889194135_r8, &
                       0.539827837277029_r8, 0.539827837277029_r8, 0.539827837277029_r8, &
                       0.788144601416603_r8]
! Bounds for quantile inversion differences
real(r8) :: inv_diff_bound(16) = [1e-10_r8, 1e-10_r8, 1e-10_r8, 1e-10_r8, 1e-10_r8, &
                                  1e-9_r8, 1e-8_r8, 1e-7_r8, 1e-7_r8, 1e-6_r8, &
                                  1e-5_r8, 1e-4_r8, 1e-3_r8, 1e-2_r8, 1e-1_r8, 1e-0_r8]

! Compare to matlab 
! Absolute value of differences should be less than 1e-15
do i = 1, 7
   cdf_diff(i) = norm_cdf(mx(i), mmean(i), msd(i)) - mcdf(i)
end do
max_matlab_diff = maxval(abs(cdf_diff))
if(max_matlab_diff > 1.0e-15_r8) then
   write(*, *) 'WARNING: Difference from Matlab baseline is too large ', max_matlab_diff
else
   write(*, *) 'Agreement with Matlab baseline is okay: max diff is < 1e-15 ', max_matlab_diff
endif

! Keep track of differences as function of quantile
max_diff = 0.0_r8
do j = 1, 16
   max_q(j) = 1.0_r8 - 0.1**j
enddo

! Test the inversion of the cdf over +/- 30 standard deviations around mean
do i = 1, num_trials + 1
   sd = min_sd + (i - 1.0_r8) * (max_sd - min_sd) / num_trials 
   quantile = norm_cdf(sd, 0.0_r8, 1.0_r8)
   call norm_inv(quantile, inv)
   do j = 1, 16
      if(quantile < max_q(j)) then
         max_diff(j) = max(abs(sd-inv), max_diff(j))
      endif
   enddo
end do

do j = 1, 16
   if(max_diff(j) > inv_diff_bound(j)) then
      write(*, *) 'WARNING: Max inversion diff ', max_diff(j), ' > bound ', inv_diff_bound(j), &
        'for quantiles < ', max_q(j)
   else
      write(*, *) 'Max inversion diff ', max_diff(j), ' OK, bound ', inv_diff_bound(j), &
        'for quantiles < ', max_q(j)
   endif
end do

end subroutine test_normal

!------------------------------------------------------------------------

function norm_cdf(x_in, mean, sd)

! Approximate cumulative distribution function for normal
! with mean and sd evaluated at point x_in
! Only works for x>= 0.

real(r8)             :: norm_cdf
real(r8), intent(in) :: x_in, mean, sd

real(digits12) :: nx

! Convert to a standard normal
nx = (x_in - mean) / sd

if(nx < 0.0_digits12) then
   norm_cdf = 0.5_digits12 * erfc(-nx / sqrt(2.0_digits12))
else
   norm_cdf = 0.5_digits12 * (1.0_digits12 + erf(nx / sqrt(2.0_digits12)))
endif

end function norm_cdf

!------------------------------------------------------------------------

subroutine weighted_norm_inv(alpha, mean, sd, p, x)

! Find the value of x for which the cdf of a N(mean, sd) multiplied times
! alpha has value p.

real(r8), intent(in)  :: alpha, mean, sd, p
real(r8), intent(out) :: x

real(r8) :: np

! VARIABLES THROUGHOUT NEED TO SWITCH TO DIGITS_12

! Can search in a standard normal, then multiply by sd at end and add mean
! Divide p by alpha to get the right place for weighted normal
np = p / alpha

! Find spot in standard normal
call norm_inv(np, x)

! Add in the mean and normalize by sd
x = mean + x * sd

end subroutine weighted_norm_inv


!------------------------------------------------------------------------

subroutine approx_norm_inv(p_in, x)

real(r8), intent(in)  :: p_in
real(r8), intent(out) :: x

! This is used to get a good first guess for the search in norm_inv

! normal inverse
! translate from http://home.online.no/~pjacklam/notes/invnorm
! a routine written by john herrero

real(r8) :: p
real(r8) :: p_low,p_high
real(r8) :: a1,a2,a3,a4,a5,a6
real(r8) :: b1,b2,b3,b4,b5
real(r8) :: c1,c2,c3,c4,c5,c6
real(r8) :: d1,d2,d3,d4
real(r8) :: q,r

! Truncate out of range quantiles, converts them to smallest positive number or largest number <1
! This solution is stable, but may lead to underflows being thrown. May want to 
! think of a better solution. 
p = p_in
if(p <= 0.0_r8) p = tiny(p_in)
if(p >= 1.0_r8) p = nearest(1.0_r8, -1.0_r8)

a1 = -39.69683028665376_digits12
a2 =  220.9460984245205_digits12
a3 = -275.9285104469687_digits12
a4 =  138.357751867269_digits12
a5 = -30.66479806614716_digits12
a6 =  2.506628277459239_digits12
b1 = -54.4760987982241_digits12
b2 =  161.5858368580409_digits12
b3 = -155.6989798598866_digits12
b4 =  66.80131188771972_digits12
b5 = -13.28068155288572_digits12
c1 = -0.007784894002430293_digits12
c2 = -0.3223964580411365_digits12
c3 = -2.400758277161838_digits12
c4 = -2.549732539343734_digits12
c5 =  4.374664141464968_digits12
c6 =  2.938163982698783_digits12
d1 =  0.007784695709041462_digits12
d2 =  0.3224671290700398_digits12
d3 =  2.445134137142996_digits12
d4 =  3.754408661907416_digits12
p_low  = 0.02425_digits12
p_high = 1_digits12 - p_low
! Split into an inner and two outer regions which have separate fits
if(p < p_low) then
   q = sqrt(-2.0_digits12 * log(p))
   x = (((((c1*q + c2)*q + c3)*q + c4)*q + c5)*q + c6) / &
      ((((d1*q + d2)*q + d3)*q + d4)*q + 1.0_digits12)
else if(p > p_high) then
   q = sqrt(-2.0_digits12 * log(1.0_digits12 - p))
   x = -(((((c1*q + c2)*q + c3)*q + c4)*q + c5)*q + c6) / &
      ((((d1*q + d2)*q + d3)*q + d4)*q + 1.0_digits12)
else
   q = p - 0.5_digits12
   r = q*q
   x = (((((a1*r + a2)*r + a3)*r + a4)*r + a5)*r + a6)*q / &
      (((((b1*r + b2)*r + b3)*r + b4)*r + b5)*r + 1.0_digits12)
endif

end subroutine approx_norm_inv

!------------------------------------------------------------------------

subroutine norm_inv(quantile_in, x)

real(r8), intent(in)  :: quantile_in
real(r8), intent(out) :: x

! This naive Newton method is much more accurate than approx_norm_inv, especially
! for quantile values less than 0.5. 

! Given a quantile q, finds the value of x for which the standard normal cdf
! has approximately this quantile

! Limit on the total iterations; Increasing this does not change any of the results
! that do not converge for the test_normal call on gfortran.
integer, parameter :: max_iterations = 50

! Limit on number of times to halve the increment; No deep thought.
integer, parameter :: max_half_iterations = 25

real(r8) :: quantile
real(r8) :: reltol, dq_dx, delta
real(r8) :: x_guess, q_guess, x_new, q_new, del_x, del_q, del_q_old, q_old
integer  :: iter, j

quantile = quantile_in
! If input quantiles are outside the supported range, move them to the extremes
quantile = min(quantile, max_quantile)
quantile = max(quantile, min_quantile)

! Do a test for illegal values
if(quantile <= 0.0_r8 .or. quantile >= 1.0_r8) then
   ! Need an error message
   write(errstring, *) 'Illegal Quantile input', quantile
   call error_handler(E_ERR, 'norm_inv', errstring, source)
endif

! Get first guess from functional approximation
call approx_norm_inv(quantile, x_guess)

! Evaluate the cdf
q_guess = norm_cdf(x_guess, 0.0_r8, 1.0_r8)

del_q = q_guess - quantile

! Iterations of the Newton method to approximate the root
do iter = 1, max_iterations
   ! PDF is derivative of CDF but this can be numerically inaccurate for extreme values
   !!!dq_dx = norm_pdf(x_guess)
   ! Do numerical derivative to get more accurate inversion
   ! These values for the delta for the approximation work with Gfortran
   delta = max(1e-8_r8, 1e-8_r8 * abs(x_guess))
      dq_dx = (norm_cdf(x_guess + delta, 0.0_r8, 1.0_r8) - &
         norm_cdf(x_guess - delta, 0.0_r8, 1.0_r8)) / (2.0_r8 * delta)
      ! Derivative of 0 means we're not going anywhere else
      if(dq_dx <= 0.0_r8) then
         x = x_guess
         return
      endif
   
   ! Linear approximation for how far to move in x
   del_x = del_q / dq_dx
   x_new = x_guess - del_x

   ! Look for convergence; If the change in x is smaller than approximate precision 
   reltol = (epsilon(x_guess))**(0.75_r8)
   if(abs(del_x) <= reltol) then
      x = x_new
      return
   endif
    
   ! If we've gone too far, the new error will be bigger than the old; 
   ! Repeatedly half the distance until this is rectified 
   del_q_old = del_q
   q_new = norm_cdf(x_new, 0.0_r8, 1.0_r8)
   do j = 1, max_half_iterations
      del_q = q_new - quantile
      if (abs(del_q) < abs(del_q_old)) then
         exit
      endif
      q_old = q_new
      x_new = (x_guess + x_new)/2.0_r8
      q_new = norm_cdf(x_new, 0.0_r8, 1.0_r8)
      ! If q isn't changing, no point in continuing
      if(q_old == q_new) exit

   end do

   x_guess = x_new
end do

! For now, have switched a failed convergence to return the latest guess
! This has implications for stability of probit algorithms that require further study
! Not currently happening for any of the test cases on gfortran
x = x_new
write(errstring, *)  'Failed to converge for quantile ', quantile
call error_handler(E_MSG, 'norm_inv', errstring, source)
!!!call error_handler(E_ERR, 'norm_inv', errstring, source)

end subroutine norm_inv

!------------------------------------------------------------------------

function norm_pdf(x)

! Pdf of standard normal evaluated at x
real(r8) :: norm_pdf
real(r8), intent(in) :: x

norm_pdf = exp(-0.5_r8 * x**2) / (sqrt(2.0_r8 * PI))

end function norm_pdf

!------------------------------------------------------------------------

end module normal_distribution_mod
