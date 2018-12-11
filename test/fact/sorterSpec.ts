import { hydrateFromTree, dehydrateFact } from '../../src/fact/hydrate';
import { FactRecord, FactReference } from '../../src/storage';
import { should } from 'chai';
import { describe, it } from 'mocha';

import { TopologicalSorter } from '../../src/fact/sorter';

should();

describe('Topological sorter', () => {
    it('should accept empty array', () => {
        const sorter = givenTopologicalSorter();
        const sorted = whenSort(sorter, []);
        sorted.should.be.empty;
    });

    it('should accept single fact', () => {
        const sorter = givenTopologicalSorter();
        const sorted = whenSort(sorter, 
            dehydrateFact({
                type: 'Singleton'
            })
        );
        sorted.length.should.equal(1);
        sorted[0].type.should.equal('Singleton');
    });

    it ('should accept facts of same hash', () => {
        const sorter = givenTopologicalSorter();
        const sorted = whenSort(sorter, 
            dehydrateFact({
                type: 'First'
            }).concat(dehydrateFact({
                type: 'Second'
            }))
        );
        sorted.length.should.equal(2);
        sorted[0].type.should.equal('First');
        sorted[1].type.should.equal('Second');
    });

    it('should attribute predecessor of same hash', () => {
        const sorter = givenTopologicalSorter();
        const sorted = whenSort(sorter, 
            dehydrateFact({
                type: 'First'
            }).concat(dehydrateFact({
                type: 'Child',
                parent: {
                    type: 'Second'
                }
            }))
        );
        sorted.length.should.equal(3);
        sorted[0].type.should.equal('First');
        sorted[1].type.should.equal('Second');
        sorted[2].type.should.equal('Child');
        const predecessor = <FactReference>sorted[2].predecessors.parent;
        predecessor.type.should.equal('Second');
    });

    it('should wait for predecessor of correct type', () => {
        const facts = dehydrateFact({
            type: 'First'
        }).concat(dehydrateFact({
            type: 'Child',
            parent: {
                type: 'Second'
            }
        }));
        const unsorted = [
            facts[0],
            facts[2],
            facts[1]
        ];
        const sorter = givenTopologicalSorter();
        const sorted = whenSort(sorter, unsorted);
        sorted.length.should.equal(3);
        sorted[0].type.should.equal('First');
        sorted[1].type.should.equal('Second');
        sorted[2].type.should.equal('Child');
        const predecessor = <FactReference>sorted[2].predecessors.parent;
        predecessor.type.should.equal('Second');
    });

    it('should handle successor before predecessor', () => {
        const facts = dehydrateFact({
            type: 'Child',
            parent: {
                type: 'Parent'
            }
        });
        const unsorted = [
            facts[1],
            facts[0]
        ];
        const sorter = givenTopologicalSorter();
        const sorted = whenSort(sorter, unsorted);
        sorted.length.should.equal(2);
        sorted[0].type.should.equal('Parent');
        sorted[0].hash.should.equal(facts[0].hash);
        sorted[1].type.should.equal('Child');
        sorted[1].hash.should.equal(facts[1].hash);
        sorted[0].hash.should.not.equal(sorted[1].hash);
    });

    it('should wait for all predecessors', () => {
        const facts = dehydrateFact({
            type: 'Child',
            first: { type: 'First' },
            second: { type: 'Second' }
        });
        const unsorted = [
            facts[2],
            facts[1],
            facts[0]
        ];
        const sorter = givenTopologicalSorter();
        const sorted = whenSort(sorter, unsorted);
        sorted.length.should.equal(3);
        sorted[2].type.should.equal('Child');
    })

    it('should handle a real world example', () => {
        const facts = [
            {
                "type": "ImprovingU.Abstract",
                "hash": "gkCYyWW5BFEO+heluEKGpuYSFi7CdyXlF3AzH7DXeiR/GSGM5jIQpkOSazF1rcZXssdwqvrxaVmp1Qr58pu00g==",
                "predecessors": {
                    "idea": {
                        "type": "ImprovingU.Idea",
                        "hash": "xWNSMeJNeHxDsrRqT0ChoAwptn1uEn7D3pxUQcmxELydfufS8IylnoSXTMvoctaqIFJeoAF1zbDbi+mqtIuCbQ=="
                    },
                    "prior": [{
                            "type": "ImprovingU.Abstract",
                            "hash": "ofFlc/jiNooYDrP1aKXsv15Ud0pBji+7k0KuZ4VneuKWCz02AHOi8yI+GZbIZZP9LShXf0mPxJgc2OKrA1zYPg=="
                        }
                    ],
                    "from": {
                        "type": "Jinaga.User",
                        "hash": "0WWlFbZH+gMoP3QGXO7/mf6hIQC/2iN7wd0peEQKFVvnJMp3gTVvi4eXfVd3DSa81MSzAVp7zVxXIiRnJTF0Kw=="
                    }
                },
                "fields": {
                    "value": "one\ntwo\nthree"
                }
            }, {
                "type": "ImprovingU.Abstract",
                "hash": "lXGr2y/MGnT283U5mF7oI+z/kZZ13kS2olxQD26vCCILIR5DmHG3orJcgNRkixmfuIUd7oGX9vdCwOZ+HGsgJg==",
                "predecessors": {
                    "idea": {
                        "type": "ImprovingU.Idea",
                        "hash": "xWNSMeJNeHxDsrRqT0ChoAwptn1uEn7D3pxUQcmxELydfufS8IylnoSXTMvoctaqIFJeoAF1zbDbi+mqtIuCbQ=="
                    },
                    "prior": [{
                            "type": "ImprovingU.Abstract",
                            "hash": "Q473l768juQLIg1i3Lx/+6gtHKSRbyfY7GK5CzudvSKtMyhT6JxxUeYC6V5c3+uVWMAavnOsxXQPGX2ev/TVnw=="
                        }
                    ],
                    "from": {
                        "type": "Jinaga.User",
                        "hash": "0WWlFbZH+gMoP3QGXO7/mf6hIQC/2iN7wd0peEQKFVvnJMp3gTVvi4eXfVd3DSa81MSzAVp7zVxXIiRnJTF0Kw=="
                    }
                },
                "fields": {
                    "value": "one\ntwo\nthree\nfour\nfive"
                }
            }, {
                "type": "ImprovingU.Abstract",
                "hash": "ofFlc/jiNooYDrP1aKXsv15Ud0pBji+7k0KuZ4VneuKWCz02AHOi8yI+GZbIZZP9LShXf0mPxJgc2OKrA1zYPg==",
                "predecessors": {
                    "idea": {
                        "type": "ImprovingU.Idea",
                        "hash": "xWNSMeJNeHxDsrRqT0ChoAwptn1uEn7D3pxUQcmxELydfufS8IylnoSXTMvoctaqIFJeoAF1zbDbi+mqtIuCbQ=="
                    },
                    "prior": [{
                            "type": "ImprovingU.Abstract",
                            "hash": "i+IaOkCvfL48ynvphvlarjGQHRNpIOyOlkxKCxEQH+EgRwcvw2e+Fb29QloU13Jg+R3Uz9ZaaVUCI3FakyzPEQ=="
                        }
                    ],
                    "from": {
                        "type": "Jinaga.User",
                        "hash": "0WWlFbZH+gMoP3QGXO7/mf6hIQC/2iN7wd0peEQKFVvnJMp3gTVvi4eXfVd3DSa81MSzAVp7zVxXIiRnJTF0Kw=="
                    }
                },
                "fields": {
                    "value": "one\ntwo"
                }
            }, {
                "type": "ImprovingU.Company",
                "hash": "aUdz/44uCMwjz2oJ/2Rw8poAJbmR1wrNTtnYiWHZv5puy/B43jcTmKXR0E0LbXe6bSKIM48uKVcicoR4afEauQ==",
                "predecessors": {},
                "fields": {
                    "name": "Improving"
                }
            }, {
                "type": "ImprovingU.Abstract",
                "hash": "i+IaOkCvfL48ynvphvlarjGQHRNpIOyOlkxKCxEQH+EgRwcvw2e+Fb29QloU13Jg+R3Uz9ZaaVUCI3FakyzPEQ==",
                "predecessors": {
                    "idea": {
                        "type": "ImprovingU.Idea",
                        "hash": "xWNSMeJNeHxDsrRqT0ChoAwptn1uEn7D3pxUQcmxELydfufS8IylnoSXTMvoctaqIFJeoAF1zbDbi+mqtIuCbQ=="
                    },
                    "prior": [],
                    "from": {
                        "type": "Jinaga.User",
                        "hash": "0WWlFbZH+gMoP3QGXO7/mf6hIQC/2iN7wd0peEQKFVvnJMp3gTVvi4eXfVd3DSa81MSzAVp7zVxXIiRnJTF0Kw=="
                    }
                },
                "fields": {
                    "value": "one"
                }
            }, {
                "type": "ImprovingU.Abstract",
                "hash": "Y3t5cOGrBG1/NmLL55HVT4qMpH808Wd5zw0Hz7ttTG3yR6g2nqISd8usOH67/4KsJ8DTXFsuzHK0DGqYMUMU9w==",
                "predecessors": {
                    "idea": {
                        "type": "ImprovingU.Idea",
                        "hash": "xWNSMeJNeHxDsrRqT0ChoAwptn1uEn7D3pxUQcmxELydfufS8IylnoSXTMvoctaqIFJeoAF1zbDbi+mqtIuCbQ=="
                    },
                    "prior": [{
                            "type": "ImprovingU.Abstract",
                            "hash": "lXGr2y/MGnT283U5mF7oI+z/kZZ13kS2olxQD26vCCILIR5DmHG3orJcgNRkixmfuIUd7oGX9vdCwOZ+HGsgJg=="
                        }
                    ],
                    "from": {
                        "type": "Jinaga.User",
                        "hash": "0WWlFbZH+gMoP3QGXO7/mf6hIQC/2iN7wd0peEQKFVvnJMp3gTVvi4eXfVd3DSa81MSzAVp7zVxXIiRnJTF0Kw=="
                    }
                },
                "fields": {
                    "value": "one\ntwo\nthree\nfour\nfive\n\nsix"
                }
            }, {
                "type": "ImprovingU.Abstract",
                "hash": "Q473l768juQLIg1i3Lx/+6gtHKSRbyfY7GK5CzudvSKtMyhT6JxxUeYC6V5c3+uVWMAavnOsxXQPGX2ev/TVnw==",
                "predecessors": {
                    "idea": {
                        "type": "ImprovingU.Idea",
                        "hash": "xWNSMeJNeHxDsrRqT0ChoAwptn1uEn7D3pxUQcmxELydfufS8IylnoSXTMvoctaqIFJeoAF1zbDbi+mqtIuCbQ=="
                    },
                    "prior": [{
                            "type": "ImprovingU.Abstract",
                            "hash": "gkCYyWW5BFEO+heluEKGpuYSFi7CdyXlF3AzH7DXeiR/GSGM5jIQpkOSazF1rcZXssdwqvrxaVmp1Qr58pu00g=="
                        }
                    ],
                    "from": {
                        "type": "Jinaga.User",
                        "hash": "0WWlFbZH+gMoP3QGXO7/mf6hIQC/2iN7wd0peEQKFVvnJMp3gTVvi4eXfVd3DSa81MSzAVp7zVxXIiRnJTF0Kw=="
                    }
                },
                "fields": {
                    "value": "one\ntwo\nthree\nfour"
                }
            }, {
                "type": "ImprovingU.Office",
                "hash": "jBdK3If9WDPqM5jMCJO02sHD2/03hNaXyFmQOXn4Q5vOBzYV5AkempdIGpirw/oaEGF9XJOZ9fkI1JzJKHeEhg==",
                "predecessors": {
                    "company": {
                        "type": "ImprovingU.Company",
                        "hash": "aUdz/44uCMwjz2oJ/2Rw8poAJbmR1wrNTtnYiWHZv5puy/B43jcTmKXR0E0LbXe6bSKIM48uKVcicoR4afEauQ=="
                    }
                },
                "fields": {
                    "name": "Dallas"
                }
            }, {
                "type": "ImprovingU.Semester",
                "hash": "xzRZ7MlatQrIpKaHAnmLRkN6D2PkTkMrlCvIpsISDae9Z0WAqdT+8fg3yTWsWoMLZ4snnmHQM6gQFC1SqZXFVw==",
                "predecessors": {
                    "office": {
                        "type": "ImprovingU.Office",
                        "hash": "jBdK3If9WDPqM5jMCJO02sHD2/03hNaXyFmQOXn4Q5vOBzYV5AkempdIGpirw/oaEGF9XJOZ9fkI1JzJKHeEhg=="
                    }
                },
                "fields": {
                    "name": "Fall 2018"
                }
            }, {
                "type": "Jinaga.User",
                "hash": "0WWlFbZH+gMoP3QGXO7/mf6hIQC/2iN7wd0peEQKFVvnJMp3gTVvi4eXfVd3DSa81MSzAVp7zVxXIiRnJTF0Kw==",
                "predecessors": {},
                "fields": {
                    "publicKey": "-----BEGIN RSA PUBLIC KEY-----\nMIGJAoGBAIBsKomutukULWw2zoTW2ECMrM8VmD2xvfpl3R4qh1whzuXV+A4EfRKMb/UAjEfw\n5nBmWvcObGyYUgygKrlNeOhf3MnDj706rej6ln9cKGL++ZNsJgJsogaAtmkPihWVGi908fdP\nLQrWTF5be0b/ZP258Zs3CTpcRTpTvhzS5TC1AgMBAAE=\n-----END RSA PUBLIC KEY-----\n"
                }
            }, {
                "type": "ImprovingU.Idea",
                "hash": "xWNSMeJNeHxDsrRqT0ChoAwptn1uEn7D3pxUQcmxELydfufS8IylnoSXTMvoctaqIFJeoAF1zbDbi+mqtIuCbQ==",
                "predecessors": {
                    "semester": {
                        "type": "ImprovingU.Semester",
                        "hash": "xzRZ7MlatQrIpKaHAnmLRkN6D2PkTkMrlCvIpsISDae9Z0WAqdT+8fg3yTWsWoMLZ4snnmHQM6gQFC1SqZXFVw=="
                    },
                    "from": {
                        "type": "Jinaga.User",
                        "hash": "0WWlFbZH+gMoP3QGXO7/mf6hIQC/2iN7wd0peEQKFVvnJMp3gTVvi4eXfVd3DSa81MSzAVp7zVxXIiRnJTF0Kw=="
                    }
                },
                "fields": {
                    "createdAt": "2018-08-09T02:54:49.238Z",
                    "title": "Topological order and you"
                }
            }
        ];

        const sorter = givenTopologicalSorter();
        const sorted = whenSort(sorter, facts);
        sorter.finished().should.be.true;
        const last = sorted[sorted.length-1];
        (<any>last.fields).value.should.equal("one\ntwo\nthree\nfour\nfive\n\nsix");
    })
});

function givenTopologicalSorter() {
    return new TopologicalSorter<FactRecord>();
}

function whenSort(sorter: TopologicalSorter<FactRecord>, facts: FactRecord[]) {
    return sorter.sort(facts, (predecessors, fact) => fact);
}