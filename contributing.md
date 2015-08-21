# Contributing

I have a vision for historical modeling, but I need your help to realize this vision in JavaScript. Here are some of the ways you can help.

## Building

Clone the repository and build the code. You will need to:

Once:

- Install [node](https://nodejs.org/)
- Run "npm install tsd@next -g"
- Run "npm install -g grunt-cli" to install the [grunt](http://gruntjs.com/getting-started) command-line interface

Each time you pull:

- Run "tsd reinstall"
- Run "tsd rebundle"
- Run "npm install"

As you work:

- Run "grunt typescript" to compile
- Run "grunt mochaTest" to run the tests
- Run "grunt" to start the watcher that will compile and run tests

If you see test failures, that's exactly where I need some help!

## Asking questions

Reach out to me on Twitter [@michaellperry](https://twitter.com/michaellperry). Ask me about the library in particular, or historical modeling in general. 

## Opening issues

Please go to the Issues tab and create issues for anything you would like to see changed. We'll talk about it there.

## Sending pull requests

Before making large changes, please let me know what you are working on. Comment on an issue, or open a new one.

Clone the repository in GitHub. Create a branch. Make your changes. Submit a pull request from your working branch against master.

If you prefer some other repository host, please open an issue and paste in your git URL and working branch name.

## Spreading the word

When you talk about the project, you can send people to http://jinaga.com. That will take them to this repository until I create a home page for the library. Then it will take them to documentation on getting started and a reference manual.

When you talk about historical modeling in general, you can send people to http://historicalmodeling.com. This site describes the general concept, common patterns, examples, and the [Correspondence](https://correspondencecloud.com) reference implementation. The goal of this project is to become a new reference implementation and sandbox for the concept.