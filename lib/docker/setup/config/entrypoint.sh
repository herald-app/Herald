#!/bin/bash -c

pwd
whoami;
if [ ! -f config/certs/ca.zip ]; then
    echo "Creating CA";
    bin/elasticsearch-certutil ca --silent --pem -out config/certs/ca.zip;
    unzip config/certs/ca.zip -d config/certs;
fi;
if [ ! -f config/certs/certs.zip ]; then
    echo "Creating certs";
    echo -ne \
    "instances:\n"\
    "  - name: es01.service.local\n"\
    "    dns:\n"\
    "      - es01.service.local\n"\
    "      - localhost\n"\
    "    ip:\n"\
    "      - 0.0.0.0\n"\
    "  - name: es02.service.local\n"\
    "    dns:\n"\
    "      - es02.service.local\n"\
    "      - localhost\n"\
    "    ip:\n"\
    "      - 0.0.0.0\n"\
    "  - name: es03.service.local\n"\
    "    dns:\n"\
    "      - es03.service.local\n"\
    "      - localhost\n"\
    "    ip:\n"\
    "      - 0.0.0.0\n"\
    "  - name: data-node.service.local\n"\
    "    dns:\n"\
    "      - data-node.service.local\n"\
    "      - localhost\n"\
    "    ip:\n"\
    "      - 0.0.0.0\n"\
    "  - name: fleet-server\n"\
    "    dns:\n"\
    "      - fleet-server.service.local\n"\
    "      - localhost\n"\
    "    ip:\n"\
    "      - 0.0.0.0\n"\
    > config/certs/instances.yml;
    bin/elasticsearch-certutil cert --silent --pem -out config/certs/certs.zip --in config/certs/instances.yml --ca-cert config/certs/ca/ca.crt --ca-key config/certs/ca/ca.key;
    unzip config/certs/certs.zip -d config/certs && rm config/certs/certs.zip;

fi;
# echo "Setting file permissions"
# chown -R root:root config/certs;
# find . -type d -exec chmod 750 \{\} \;;
# find . -type f -exec chmod 640 \{\} \;;
echo "Waiting for Elasticsearch availability";
until curl -s --cacert config/certs/ca/ca.crt https://es01.service.local:9200 | grep -q "missing authentication credentials"; do sleep 30; done;
echo "Setting kibana_system password";
until curl -s -X POST --cacert config/certs/ca/ca.crt -u "elastic:changeme" -H "Content-Type: application/json" https://es01.service.local:9200/_security/user/kibana_system/_password -d "{\"password\":\"changeme\"}" | grep -q "^{}"; do sleep 10; done;
echo "Kibana password has been set!";
while echo "Waiting for initial cluster to form"; do sleep 30; done;
