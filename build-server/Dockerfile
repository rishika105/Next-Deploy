FROM ubuntu:focal

RUN apt-get update
RUN apt-get install -y curl  
#for api tools

#node js in docker container 
RUN curl -sL https://deb.nodesource.com/setup_20.x | bash -
RUN apt-get upgrade -y
RUN apt-get install -y nodejs

#install git coz we need git to build our code
#code can be huge our server cant have that much storage use docker
#and s3 for output build folder storage
RUN apt-get install git -y

#automatically execute this shell command when server runs
WORKDIR /home/app

COPY main.sh main.sh
COPY script.js script.js
COPY package*.json .
COPY kafka.pem kafka.pem
COPY prisma ./prisma

RUN npx prisma generate

RUN npm install

RUN chmod +x main.sh
RUN chmod +x script.js

ENTRYPOINT [ "/home/app/main.sh" ]



