# Contributing

I have a vision for historical modeling, but I need your help to realize this vision in JavaScript. Here are some of the ways you can help.

## Building

Clone the repository and build the code. You will need to:

Once:

- Install [node](https://nodejs.org/)
- Run "npm install bower -g" to install [Bower](http://bower.io/)
- Run "npm install tsd@next -g" to install the [Typescript definition manager](http://definitelytyped.org/tsd/)
- Run "npm install -g grunt-cli" to install the [grunt](http://gruntjs.com/getting-started) command-line interface

Each time you pull:

- Run "tsd reinstall"
- Run "tsd rebundle"
- Run "npm install"
- Run "bower install"

As you work:

- Run "grunt typescript" to compile
- Run "grunt mochaTest" to run the tests
- Run "grunt" to start the watcher that will compile and run tests

If you see test failures, that's exactly where I need some help!

## Testing

Follow the instructions in the [ImprovingU](https://github.com/jinaga/ImprovingU/blob/master/README.md) Jinaga sample app. Create your own application using Jinaga, and let me know what issues you find. Open [issues](https://github.com/michaellperry/jinaga/issues) in this repository.

## Roadmap

The large steps to achieve the vision of Historical Modeling in JavaScript and beyond are documented in the [Jinaga Roadmap](https://github.com/michaellperry/jinaga/blob/master/roadmap.md). Please look through that document to decide where you want to help out.

## Recommendations

Create [issues](https://github.com/michaellperry/jinaga/issues) for anything you would like to see changed in the roadmap. We will discuss it in the public arena. Keep in mind, however, that recommendations for changes are to be defended. Be prepared to provide evidence that it makes the system more resilient, more secure, or easier to use. Personal preference is not evidence.

## Sending pull requests

Before making large changes, please let me know what you are working on. Comment on an issue, or open a new one.

Clone the repository in GitHub. Create a branch. Make your changes. Submit a pull request from your working branch against master.

If you prefer some other repository host, please open an issue and paste in your git URL and working branch name.

## Asking questions

Reach out to me on Twitter [@michaellperry](https://twitter.com/michaellperry). Ask me about the library in particular, or historical modeling in general. 

## Spreading the word

When you talk about the project, you can send people to http://jinaga.com. That will take them to this repository until I create a home page for the library. Then it will take them to documentation on getting started and a reference manual.

When you talk about historical modeling in general, you can send people to http://historicalmodeling.com. This site describes the general concept, common patterns, examples, and the [Correspondence](https://correspondencecloud.com) reference implementation. The goal of this project is to become a new reference implementation and sandbox for the concept.