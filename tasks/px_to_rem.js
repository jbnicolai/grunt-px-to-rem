/*
 * grunt-px-to-rem
 * https://github.com/walbo/grunt-px-to-rem
 *
 * Copyright (c) 2014 Petter Walbø Johnsgård
 * Licensed under the MIT license.
 */

'use strict';

var chalk = require('chalk');

module.exports = function (grunt) {

    grunt.registerMultiTask('px_to_rem', 'Convert px to rem', function() {

        // Options
        var options = this.options({
            base: 16,
            fallback: false,
            max_decimals: 20
        });    

        var pxToRem = function (css) {

            var postcss = require('postcss'),
                processor = postcss(function (css) {
                    css.eachRule( function (rule ,i) {

                        // Find elements that has fallback allready
                        var hasFallback = checkFallback( rule.decls );

                        rule.eachDecl(function (decl, i) {
                        

                            // Values of 0 shouldn't have units specified.
                            decl.value = decl.value.replace( /([!]?\d*\.?\d+)\s*(pxi|px|rem)/g, function($1) {
                                if ( $1 === '0pxi' || $1 === '0px' || $1 === '!0px' || $1 === '0rem' ) {
                                    $1 = 0;
                                }
                                return $1;
                            });

                            var value = decl.value;
                           
                            // Change !px || pxi values to px
                            if ( value.match( /(!|pxi)/ ) ) {
                                value = value.replace( '!', '' ).replace( 'pxi', 'px' );
                                decl.value = value;
                            }
                            
                            else {
                                // If both rem and px is defined return
                                if ( hasFallback.indexOf( decl.prop ) !== -1 ) {
                                    return decl.value;
                                }

                                // If already rem, create fallback if options.fallback
                                if ( options.fallback && value.indexOf( 'rem' ) !== -1 ) {
                                        value = value.replace( /(\d*\.?\d+)rem/ig, function ($1, $2) {
                                            return Math.floor( parseFloat($2) * options.base ) + 'px';
                                        });

                                        decl.parent.insertBefore(i, decl.clone({ value: value }));
                                        decl.fallback = true;
                                } 

                                // Convert px to rem
                                if ( value.indexOf( 'px' ) !== -1 ) {
                                    value = value.replace( /(\d*\.?\d+)px/ig, function ($1, $2) {
                                        return parseFloat( $2 / options.base ).maxDigits( options.max_decimals ) + 'rem';
                                    });

                                    if ( options.fallback && ! decl.fallback ) {
                                        decl.parent.insertBefore( i, decl.clone() );
                                        decl.value = value;
                                    } else {
                                        decl.value = value;
                                    }
                                }
                            }
                        });
                       
                    });
                    
                });

            return processor.process(css).css;
        };

        // Function to check if rem and px exist
        function checkFallback( obj ) {
            var props = [],
                hasFallback = [],
                values = [];

            for (var prop in obj) {
                if (obj.hasOwnProperty(prop)) {
                    var pro = obj[prop].prop;

                    if ( props.indexOf( pro ) === -1 ) {

                        props.push( pro );
                        values.push({prop: pro, val:obj[prop].value});

                    } else {
                        var lookup = {};
                        for (var i = 0, len = values.length; i < len; i++) {
                            lookup[values[i].prop] = values[i].val;
                        }

                        if ( lookup[pro].search( 'px' ) === -1 &&  obj[prop].value.search( 'rem' ) === -1) {
                             hasFallback.push( pro );
                        } else if ( lookup[pro].search( 'rem' ) === -1 &&  obj[prop].value.search( 'px' ) === -1) {
                             hasFallback.push( pro );
                        }
                    }
                }
            }

            return hasFallback;
        }

        // Max digit function
        Number.prototype.maxDigits = function( max ) {
			if ( !max || max > 20 ) { return this; }
			
			return + ( Math.round( this + "e+" + max )  + "e-" + max );
		};

        // Iterate over all specified file groups.
        this.files.forEach( function ( f ) {
            // Concat specified files.
            var src = f.src.filter( function ( filepath ) {
            
                // Warn on and remove invalid source files (if nonull was set).
                if ( ! grunt.file.exists( filepath ) ) {
                    grunt.log.warn( 'Source file "' + filepath + '" not found.' );
                    return false;
                } else {
                    return true;
                }

            }).map( function ( filepath ) {
                // Read file source & convert to rem unit
                var css = pxToRem( grunt.file.read( filepath ) );
                return css;
            });

            // Write the destination file.
            grunt.file.write( f.dest, src );

            // Print a success message.
            grunt.log.writeln( 'File ' + chalk.cyan(f.dest) + ' created.' );
        });
    });
};