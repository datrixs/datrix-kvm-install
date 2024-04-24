#!/usr/bin/env bash

# ======== Install Basic Environment On Debian Linux ==========
apt update
apt install -y build-essential
apt install -y autoconf automake libtool
apt install -y libevent-dev libbsd-dev
apt install -y libssl-dev libnice-dev libconfig-dev libjansson-dev
apt install -y autoconf-archive
apt install -y libsystemd-dev libsqlite3-dev
apt install -y nginx

# ============ Install openssl ==============
echo "Start Install openssl-1.1.1s ..."
wget -c https://www.openssl.org/source/openssl-1.1.1o.tar.gz
tar -xvf openssl-1.1.1o.tar.gz
cd openssl-1.1.1o
./config --prefix=/usr/local/openssl
make && make install
if [ $? -eq 0 ]; then
  echo "Install openssl-1.1.1s Successfully ..."
  echo "End Install openssl-1.1.1s ..."
else
  echo "Install openssl-1.1.1s Failed !"
  exit 1
fi
cd ../

# =========== Install Python3.10.5 ==========
echo "Start Install Python3.10.5 ..."
wget -c https://www.python.org/ftp/python/3.10.5/Python-3.10.5.tgz
tar -zxvf Python-3.10.5.tgz
cd Python-3.10.5
./configure --with-openssl=/usr/local/openssl/ --enable-shared
make && make install
cp libpython3.10.so.1.0 /lib/aarch64-linux-gnu/
rm -rf /usr/bin/python
ln -s /usr/local/bin/python3 /usr/bin/python
ln -s /usr/local/bin/pip3 /usr/bin/pip
ln -s /usr/local/bin/python3.10-config /usr/bin/python-config
python-config --includes
cp -r /usr/local/include/python3.10 /usr/include
if [ $? -eq 0 ]; then
  echo "Install Python3.10.5 Successfully ..."
  echo "End Install Python3.10.5 ..."
else
  echo "Install Python3.10.5 Failed !"
  exit 1
fi
cd ../

# =========== Install Ustreamer Plugins ===========
echo "Start Install Ustreamer ..."
git clone https://github.com/datrixs/datrix-ustreamer.git
cd datrix-ustreamer
make && make install
if [ $? -eq 0 ]; then
  echo "Install Ustreamer Successfully..."
  echo "End Install Ustreamer ..."
else
  echo "Install Ustreamer Failed !"
  exit 1
fi
cd ../

# =========== Install libsrtp Plugins =========
wget https://github.com/cisco/libsrtp/archive/v2.2.0.tar.gz
tar xfv v2.2.0.tar.gz
cd libsrtp-2.2.0
./configure --prefix=/usr --enable-openssl
make shared_library && make install
if [ $? -eq 0 ]; then
  echo "Install libsrtp Successfully..."
  echo "End Install libsrtp ..."
else
  echo "Install libsrtp Failed !"
  exit 1
fi
cd ../

# ================ Install libwebscokets Plugin ===========
git clone https://libwebsockets.org/repo/libwebsockets
cd libwebsockets
git checkout v4.3-stable
mkdir -p build && cd build
cmake -DLWS_MAX_SMP=1 -DLWS_WITHOUT_EXTENSIONS=0 -DCMAKE_INSTALL_PREFIX:PATH=/usr -DCMAKE_C_FLAGS="-fpic" ..
make && make install
if [ $? -eq 0 ]; then
  echo "Install libwebscokets Successfully..."
  echo "End Install libwebscokets ..."
else
  echo "Install libwebscokets Failed !"
  exit 1
fi
cd ../../

# ================ Install janus-gateway Plugin ===========
echo "Start Install janus-gateway Plugin ..."
git clone --depth=1 https://github.com/meetecho/janus-gateway.git
cd janus-gateway
./autogen.sh && ./configure --prefix=/usr --sysconfdir=/etc --disable-docs --disable-data-channels --disable-turn-rest-api --disable-all-plugins --disable-all-loggers --disable-all-transports --enable-websockets --disable-sample-event-handler --disable-websockets-event-handler --disable-gelf-event-handler
make && make install
if [ $? -eq 0 ]; then
  echo "Install janus-gateway Successfully..."
  echo "End Install janus-gateway ..."
else
  echo "Install janus-gateway Failed !"
  exit 1
fi
cd ../

# ========= Install libgpiod-1.6.3 =============
echo "Start Install libgpiod-1.6.3 ..."
wget https://git.kernel.org/pub/scm/libs/libgpiod/libgpiod.git/snapshot/libgpiod-1.6.3.tar.gz
tar xvf libgpiod-1.6.3.tar.gz
cd libgpiod-1.6.3
mkdir m4
./autogen.sh --prefix=/usr --enable-tools=yes --enable-bindings-cxx --enable-bindings-python
make && make install
cp bindings/python/.libs/* /usr/lib/python3.10/site-packages/
if [ $? -eq 0 ]; then
  echo "Install libgpiod-1.6.3 Successfully..."
  echo "End Install libgpiod-1.6.3 ..."
else
  echo "Install libgpiod-1.6.3 Failed !"
  exit 1
fi
cd ../

# ================= Install Python library ============
python -m pip install --upgrade pip
pip install -r requirements.txt --default-timeout=1000
if [ $? -eq 0 ]; then
  echo "Install Python library Successfully..."
  echo "End Install Python library ..."
else
  echo "Install Python library Failed !"
  exit 1
fi

# ========= Install KVMD Service ============
echo "Start Install KVMD Service ..."
git clone https://github.com/datrixs/datrix-kvm.git
cd datrix-kvm
python setup.py install
cp -r /usr/lib/python3.10/site-packages/gpiod* /usr/local/lib/python3.10/site-packages/
if [ $? -eq 0 ]; then
  echo "Install KVMD Service Successfully..."
  echo "End Install KVMD Service ..."
else
  echo "Install KVMD Service Failed !"
  exit 1
fi
cd ../

# vcgencmd
mkdir -p /opt/vc/bin && cp ./vcgencmd /opt/vc/bin
chmod +x /opt/vc/bin/vcgencmd

# =============== Install kvmd_config ============
cd kvmd_config
cp -r ./usr/* /usr/
cp -r ./var/* /var/
cp -r ./etc/* /etc/
cd ../

# ============ Install base_config ======
cd base_config
cp -r ./etc/* /etc/
cd ../

# ======== ustreamer ==========
ln -s /bin/ip /usr/bin/ip
ln -s /bin/systemctl /usr/bin/systemctl

mkdir -p /tmp/kvmd-nginx/client_body_temp
mkdir -p /usr/share/tessdata

# ========= udev rules config =============
mv /etc/udev/rules.d/99-kvmd.rules /etc/udev/rules.d/99-kvmd.rules.bak
cp ./v0-mine-99-kvmd.rules /etc/udev/rules.d/

# ================ usb config ============
mv /etc/init.d/.usb_config /etc/init.d/.usb_config-bak
touch /etc/init.d/.usb_config
usermod -a -G $USER www-data

# =============== reboot system ==========
echo "Install All Plugin And Service Successfully, Will reboot System"
reboot

## ============= Run kvmd Server ===========
systemctl daemon-reload
systemctl restart kvmd
systemctl restart kvmd-nginx

