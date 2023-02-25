#!/usr/bin/env python
# coding: utf-8

# In[1]:


'''
Author: Tate Smith - u@ou.edu
Date: Feb. 2, 2022

Adapted from the following:

Deep Learning Demo: XOR

Command line version

Andrew H. Fagg (andrewhfagg@gmail.com)
'''

import math
import tensorflow as tf
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import os
import time
import re

import argparse
import pickle

import tensorflowjs as tfjs
from create_cnn import *

# Tensorflow 2.x way of doing things
from tensorflow.keras.layers import InputLayer, Dense, Dropout, BatchNormalization
from tensorflow.keras.models import Sequential

#################################################################
# Default plotting parameters
FONTSIZE = 18
plt.rcParams['figure.figsize'] = (10, 6)
plt.rcParams['font.size'] = FONTSIZE

#################################################################
def build_model(n_inputs, n_hidden, n_output, activation='elu', lrate=0.0002):
    '''
    Construct a network with one hidden layer
    - Adam optimizer
    - MSE loss
    
    :param n_inputs: Number of input dimensions
    :param n_hidden: Number of units in the hidden layer
    :param n_output: Number of ouptut dimensions
    :param activation: Activation function to be used for hidden and output units
    :param lrate: Learning rate for Adam Optimizer
    '''
    #using hidden 40
    model = Sequential();
    model.add(InputLayer(input_shape=(n_inputs,)))
    model.add(BatchNormalization())
    model.add(Dense(n_hidden, use_bias=True, name="hidden", kernel_regularizer=tf.keras.regularizers.L1L2(l1=0.001), activation=activation))
    model.add(Dropout(rate=0.005))
    model.add(Dense(n_hidden, use_bias=True, name="hidden1", kernel_regularizer=tf.keras.regularizers.L1L2(l1=0.001), activation=activation))
    model.add(Dropout(rate=0.005))
    
    
    
    model.add(Dense(n_hidden, use_bias=True, name="hidden2", kernel_regularizer=tf.keras.regularizers.L1L2(l1=0.001), activation=activation))
    model.add(Dropout(rate=0.005))
    
    model.add(Dense(n_hidden, use_bias=True, name="hidden3", kernel_regularizer=tf.keras.regularizers.L1L2(l1=0.001), activation=activation))
    model.add(Dropout(rate=0.005))
    
    model.add(Dense(n_hidden, use_bias=True, name="hidden4", kernel_regularizer=tf.keras.regularizers.L1L2(l1=0.001), activation=activation))
    model.add(Dropout(rate=0.005))
    # model.add(Dense(n_hidden, use_bias=True, name="hidden5", kernel_regularizer=tf.keras.regularizers.l1(0.003), activation=activation))
    # model.add(Dropout(rate=0.05))
    '''
    model.add(Dense(n_hidden, use_bias=True, name="hidden6", activation=activation))
    model.add(Dropout(rate=0.05))
    model.add(Dense(n_hidden, use_bias=True, name="hidden7", activation=activation))
    model.add(Dropout(rate=0.05))
    '''
    # model.add(Dense(n_hidden, use_bias=True, name="hidden4", kernel_regularizer=tf.keras.regularizers.l1(0.0005), activation=activation))
    # model.add(Dense(n_hidden, use_bias=True, name="hidden5", kernel_regularizer=tf.keras.regularizers.l1(0.0005), activation=activation))

    model.add(Dense(n_output, use_bias=True, name="output", activation='sigmoid'))
    
    # Optimizer
    opt = tf.keras.optimizers.Adam(learning_rate=lrate, beta_1=0.9, beta_2=0.999,
                                epsilon=None, decay=0.0, amsgrad=False)

    # Metrics 
    # rmse = tf.keras.metrics.RootMeanSquaredError()
    
    # Bind the optimizer and the loss function to the model
    model.compile(loss='binary_crossentropy', optimizer=opt, metrics=['accuracy'])
    
    # Generate an ASCII representation of the architecture
    print(model.summary())
    return model

def args2string(args):
    '''
    Translate the current set of arguments
    
    :param args: Command line arguments
    '''
    return "exp_%02d"%(args.exp)
    
    
########################################################
def execute_exp(args):
    '''
    Execute a single instance of an experiment.  The details are specified in the args object
    
    :param args: Command line arguments
    '''

    ##############################
    
    
   
    # load the dataset
    dataset = np.loadtxt('C:/Users/tates/Acquire/training_output/state_history.csv', delimiter=',')

    ######################
    # DATA PREPROCESSING #
    ######################

    proportion_train = 0.8
    proportion_valid = 0.1
    proportion_test = 0.1
    n_train = math.floor(len(dataset) * proportion_train)
    n_valid = math.floor(len(dataset) * proportion_valid)
    n_test = math.floor(len(dataset) * proportion_test)

    raw_board_dataset = dataset[:,0:1080]
    board_dataset = raw_board_dataset.reshape(len(raw_board_dataset), 10, 9, 12, 1)
    board_dataset_channels = np.empty((len(raw_board_dataset), 9, 12, 10), int)
    for i, record in enumerate(board_dataset):
        board_dataset_channels[i] = np.concatenate(record, axis=2)
    print(board_dataset_channels[0][0])
    print(np.shape(board_dataset_channels))
    non_board_data = dataset[:,1080:len(dataset[0])]
    
    
    # board
    board_input_train = board_dataset_channels[0 : n_train]
    board_input_valid = board_dataset_channels[n_train : n_train + n_valid]
    board_input_test = board_dataset_channels[n_train + n_valid : ]
    
    
    # non-board

    data_train = non_board_data[0 : n_train]
    data_valid = non_board_data[n_train : n_train + n_valid]
    data_test = non_board_data[n_train + n_valid : ]
    scalar_input_train = data_train[:,0:len(non_board_data[0])-2]
    print(scalar_input_train[0])
    train_y = data_train[:,len(non_board_data[0])-2:]
    print(train_y[0])
    

    scalar_input_valid = data_valid[:,0:len(non_board_data[0])-2]
    valid_y = data_valid[:,len(non_board_data[0])-2:]

    scalar_input_test = data_test[:,0:len(non_board_data[0])-2]
    
    
    test_y = data_test[:,len(non_board_data[0])-2:]
    print(test_y[0])
    


    # cnn


    # Build the model
    

    # Network config
    # NOTE: this is very specific to our implementation of create_cnn_classifier_network()
    #   List comprehension and zip all in one place (ugly, but effective).
    #   Feel free to organize this differently
    dense_layers = [{'units': i} for i in args.hidden]
    conv_layers = [{'filters': f, 'kernel_size': (s,s), 'pool_size': (p,p), 'strides': (p,p)} if p > 1
                   else {'filters': f, 'kernel_size': (s,s), 'pool_size': None, 'strides': None}
                   for s, f, p, in zip(args.conv_size, args.conv_nfilters, args.pool)]
    
    print("Dense layers:", dense_layers)
    print("Conv layers:", conv_layers)
    # if args.deep == 0:
    #     tensorArchitectures = [[[2], [2], [4], [4], [8], [8], [16], [16], [32]], [[50], [25]]]
    # else:
    #     tensorArchitectures = [[[10, 20], [4, 8]], [[30, 50], [10, 15]]]

    model = create_cnn_evaluator_network([9,12], 10, n_scalar_inputs=len(scalar_input_train[0]), conv_layers=conv_layers, dense_layers=dense_layers, lrate=0.00005)

    
    #model = build_model(len(train_x[0]), args.hidden, 1, activation='elu')

    # Callbacks
    
    early_stopping_cb = tf.keras.callbacks.EarlyStopping(patience=1000,
                                                      restore_best_weights=True,
                                                      min_delta=0.00001)

    # Describe arguments
    argstring = args2string(args)
    print("EXPERIMENT: %s"%argstring)
    
    # Only execute if we are 'going'
    if not args.nogo:
        # Training
        print("Training...")
        
        history = model.fit(x=[board_input_train, scalar_input_train], y=train_y, epochs=args.epochs, 
                            verbose=True,
                            batch_size=128,
                            shuffle=True,
                            validation_data=([board_input_valid, scalar_input_valid], valid_y),
                            callbacks=[early_stopping_cb])
        
        print("Done Training")

        plt.plot(history.history['root_mean_squared_error'])
        plt.plot(history.history['val_root_mean_squared_error'])
        plt.ylabel('Root MSE')
        plt.xlabel('epochs')
        plt.legend(["Training", "Validation"])
        plt.show()
        plt.savefig('result.png')

        # abs_error = np.abs(model.predict([board_input_test, scalar_input_test]) - test_y)
        np.savetxt("results/predictions_rounded.txt", (np.round(model.predict([board_input_test, scalar_input_test]))).astype(int))
        np.savetxt("results/predictions.txt", model.predict([board_input_test, scalar_input_test]))
        print(model.evaluate([board_input_test, scalar_input_test], test_y))

        
        # Save the training history
        fp = open("results/hw0_results_%s.pkl"%(argstring), "wb")
        pickle.dump(history.history, fp)
        pickle.dump(args, fp)
        # pickle.dump(abs_error, fp)
        fp.close()

        # Save the model (can't be included in the pickle file)
        #model.save("%s_model"%("1"))

        
        tfjs.converters.save_keras_model(model, "model_1")


def display_learning_curve(fname):
    '''
    Display the learning curve that is stored in fname
    
    :param fname: Results file to load and dipslay
    
    '''
    
    # Load the history file and display it
    fp = open(fname, "rb")
    history = pickle.load(fp)
    # TODO
    fp.close()
    
    # Display
    plt.plot(history['loss'])
    plt.plot(history['val_loss'])
    plt.ylabel('MSE')
    plt.xlabel('epochs')
    plt.show()
    plt.savefig('result.png')

def display_learning_curve_set(dir, base):
    '''
    Plot the learning curves for a set of results
    
    :param base: Directory containing a set of results files
    '''
    # Find the list of files in the local directory that match base_[\d]+.pkl
    files = [f for f in os.listdir(dir) if re.match(r'%s.+.pkl'%(base), f)]
    files.sort()
    
    for f in files:
        with open("%s/%s"%(dir,f), "rb") as fp:
            history = pickle.load(fp)
            plt.plot(history['val_loss'])
            
    plt.ylabel('MSE')
    plt.xlabel('epochs')
    plt.legend(files, fontsize=6)
    plt.savefig('resultSet.png')
    
def display_error_hist(dir, base):
    '''
    Display a histogram of absolute errors of all model predictions
    '''
    # Find the list of files in the local directory that match base_[\d]+.pkl
    files = [f for f in os.listdir(dir) if re.match(r'%s.+.pkl'%(base), f)]
    files.sort()
    errors = []
    
    for f in files:
        with open("%s/%s"%(dir,f), "rb") as fp:
            hist = pickle.load(fp)
            junk = pickle.load(fp)
            error = pickle.load(fp)
            errors.append(error)
            
    allErrors = np.concatenate(errors)
    plt.close()
    plt.hist(allErrors, 300)
    plt.savefig('errorHist.png')
    
    
def create_parser():
    '''
    Create a command line parser for the experiment
    '''
    parser = argparse.ArgumentParser(description='XOR Learner')
    parser.add_argument('--exp', type=int, default=0, help='Experimental index')
    parser.add_argument('--epochs', type=int, default=100, help='Number of Training Epochs')
    # Hidden unit parameters
    parser.add_argument('--hidden', nargs='+', type=int, default=[100, 5], help='Number of hidden units per layer (sequence of ints)')
    parser.add_argument('--gpu', action='store_true', help='Use gpu')
    parser.add_argument('--nogo', action='store_true', help='Do not preform the experiment')
    # Convolutional parameters
    parser.add_argument('--conv_size', nargs='+', type=int, default=[5], help='Convolution filter size per layer (sequence of ints)')
    parser.add_argument('--conv_nfilters', nargs='+', type=int, default=[10], help='Convolution filters per layer (sequence of ints)')
    parser.add_argument('--pool', nargs='+', type=int, default=[2], help='Max pooling size (1=None)')


    return parser

'''
This next bit of code is executed only if this python file itself is executed
(if it is imported into another file, then the code below is not executed)
'''
if __name__ == "__main__":
    # Parse the command-line arguments
    parser = create_parser()
    args = parser.parse_args()
    
    # Turn off GPU?
    if not args.gpu:
        os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
        
    # GPU check
    physical_devices = tf.config.list_physical_devices('GPU') 
    n_physical_devices = len(physical_devices)
    if(n_physical_devices > 0):
        tf.config.experimental.set_memory_growth(physical_devices[0], True)
        print('We have %d GPUs\n'%n_physical_devices)
    else:
        print('NO GPU')

    # Do the work
    execute_exp(args)
    display_learning_curve_set('results', 'hw0_results')
    #display_learning_curve_set('results', 'hw0_results')

