FROM docker.elastic.co/elasticsearch/elasticsearch:8.6.2

USER root
RUN mkdir config/certs
RUN chown elasticsearch config/certs
RUN apt-get update
RUN apt-get install -y vim
RUN apt-get install -y nano


USER elasticsearch
RUN bin/elasticsearch-plugin install --batch discovery-ec2
