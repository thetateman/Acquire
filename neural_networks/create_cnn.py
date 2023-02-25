'''
Author: Tate Smith - u@ou.edu
Date: March 4, 2022
'''

import tensorflow as tf
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from tensorflow import keras
import os
import time
import re

import argparse
import pickle

# Tensorflow 2.x way of doing things
from tensorflow.keras.models import Sequential
from tensorflow.keras import regularizers, Input, Model

from tensorflow.keras.layers import InputLayer, Convolution2D, Dense, MaxPooling2D, Flatten, BatchNormalization, Dropout, concatenate
import random
import re

#################################################################
# Default plotting parameters
FONTSIZE = 18
plt.rcParams['figure.figsize'] = (10, 6)
plt.rcParams['font.size'] = FONTSIZE

#################################################################


def create_cnn_evaluator_network(image_size,
                                  nchannels,
                                  n_scalar_inputs=1,
                                  conv_layers=None,
                                  dense_layers=None,
                                  p_dropout=0.05,
                                  lambda_l1=None,
                                  lrate=0.0001, n_output=2):
    
    if lambda_l1 is not None:
        lambda_l1 = tf.keras.regularizers.l1(lambda_l1)
    
    # setup inputs
    boardInput = tempTensor = Input(shape=(image_size[0], image_size[1], nchannels))
    scalarInput = tempTensor2 = Input(shape=(n_scalar_inputs,))
    tempTensor2 = BatchNormalization()(tempTensor2)
    tempTensor2 = Dense(units=25,
                    activation='relu',
                    use_bias = True, 
                    kernel_initializer = 'random_uniform',
                    bias_initializer = 'zeros',
                    name = f'dense_scalar_branch',
                    kernel_regularizer = lambda_l1)(tempTensor2)
    
    tempTensor2 = Dropout(p_dropout)(tempTensor2)
    
    for i, conv_layer in enumerate(conv_layers):
        
        tempTensor = Convolution2D(filters = conv_layer['filters'],
                            kernel_size = conv_layer['kernel_size'],
                            strides = 1, 
                            padding = 'valid', 
                            use_bias = True, 
                            kernel_initializer = 'random_uniform',
                            bias_initializer = 'zeros',
                            name = f'C{i}',
                            activation = 'elu', 
                            kernel_regularizer = lambda_l1)(tempTensor)
            
        if(conv_layer['pool_size']):
            tempTensor = MaxPooling2D(pool_size=conv_layer['pool_size'],
                            strides = conv_layer['strides'])(tempTensor)
        
    
    tempTensor = Flatten()(tempTensor)

    # Merge convolutional and dense branches of the network
    tempTensor = concatenate([tempTensor, tempTensor2])
    
    for i, dense_layer in enumerate(dense_layers):
        tempTensor = Dense(units=dense_layer['units'],
                    activation='relu',
                    use_bias = True, 
                    kernel_initializer = 'random_uniform',
                    bias_initializer = 'zeros',
                    name = f'dense{i}',
                    kernel_regularizer = lambda_l1)(tempTensor)
    
        tempTensor = Dropout(p_dropout)(tempTensor)
    
    #output layer
    outputLayer = Dense(units=n_output,
                    activation='linear',
                    use_bias=True,
                    kernel_initializer = 'truncated_normal',
                    bias_initializer = 'zeros',
                    name = 'output',
                    kernel_regularizer = lambda_l1)(tempTensor)
                    
        
    opt = tf.keras.optimizers.Adam(lr=lrate, beta_1=0.9, beta_2=0.999,
                                   epsilon=None, decay=0.0, amsgrad=False)
    

    model = Model(
        inputs=[boardInput, scalarInput],
        outputs=outputLayer,
        name="AcquireStateEvaluator"
     )
   
    # Metrics 
    rmse = tf.keras.metrics.RootMeanSquaredError()
    model.compile(loss='mse', optimizer=opt, metrics=[rmse])
    
    print(model.summary())
    
    return model

