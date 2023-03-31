FROM docker.elastic.co/kibana/kibana:8.6.2

RUN bin/kibana-encryption-keys generate --force

USER root
RUN mkdir config/certs
RUN chown kibana config/certs
RUN chown kibana:root data
RUN apt-get update
RUN apt-get install -y vim
RUN apt-get install -y nano

USER kibana
COPY /config/kibana.yml /usr/share/kibana/config/kibana.yml