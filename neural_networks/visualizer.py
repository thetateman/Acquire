#!/usr/bin/env python
# coding: utf-8

'''
Author: Tate Smith - u@ou.edu
Date: Feb. 2, 2022
Creates results images. Run once after running a batch of jobs on OSCER. 
'''

from acquire_test import *
display_learning_curve_set('results', 'hw0_results')
display_error_hist('results', 'hw0_results')