FROM docker.elastic.co/kibana/kibana:8.6.2

USER root
RUN mkdir config/certs
RUN chown kibana config/certs
RUN chown kibana:root data

USER kibana
COPY /config/kibana.yml /usr/share/kibana/config/kibana.yml
