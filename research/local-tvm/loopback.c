#define _GNU_SOURCE
#include <dlfcn.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <errno.h>
#include <string.h>
int bind(int fd,const struct sockaddr*a,socklen_t n){int(*f)(int,const struct sockaddr*,socklen_t)=dlsym(RTLD_NEXT,"bind");struct sockaddr_storage s;memcpy(&s,a,n);if(a->sa_family==AF_INET)((struct sockaddr_in*)&s)->sin_addr.s_addr=htonl(INADDR_LOOPBACK);if(a->sa_family==AF_INET6)((struct sockaddr_in6*)&s)->sin6_addr=in6addr_loopback;return f(fd,(struct sockaddr*)&s,n);}
int connect(int fd,const struct sockaddr*a,socklen_t n){int(*f)(int,const struct sockaddr*,socklen_t)=dlsym(RTLD_NEXT,"connect");if(a->sa_family==AF_INET && (ntohl(((struct sockaddr_in*)a)->sin_addr.s_addr)>>24)!=127){errno=ENETUNREACH;return -1;}if(a->sa_family==AF_INET6 && !IN6_IS_ADDR_LOOPBACK(&((struct sockaddr_in6*)a)->sin6_addr)){errno=ENETUNREACH;return -1;}return f(fd,a,n);}
