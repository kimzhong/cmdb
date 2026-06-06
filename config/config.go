package config

import (
	"fmt"
	"log"

	"github.com/spf13/viper"
)

type Config struct {
	Server  ServerConfig  `mapstructure:"server"`
	MongoDB MongoDBConfig `mapstructure:"mongodb"`
	Ldap    LdapConfig    `mapstructure:"ldap"`
	JWT     JWTConfig     `mapstructure:"jwt"`
	Log     LogConfig     `mapstructure:"log"`
}

type ServerConfig struct {
	Host string `mapstructure:"host"`
	Port int    `mapstructure:"port"`
}

type MongoDBConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	Database string `mapstructure:"database"`
	Username string `mapstructure:"username"`
	Password string `mapstructure:"password"`
}

type LdapConfig struct {
	Enabled bool       `mapstructure:"enabled"`
	Host     string    `mapstructure:"port"`
	Port     int       `mapstructure:"port"`
	BaseDN   string    `mapstructure:"base_dn"`
	UserDN   string    `mapstructure:"user_dn"`
	Password string    `mapstructure:"password"`
	UseSSL   bool      `mapstructure:"use_ssl"`
	AD       ADConfig  `mapstructure:"ad"`
}

type ADConfig struct {
	Enabled  bool   `mapstructure:"enabled"`
	Domain   string `mapstructure:"domain"`
	BaseDN   string `mapstructure:"base_dn"`
}

type JWTConfig struct {
	Secret string `mapstructure:"secret"`
	Expire string `mapstructure:"expire"`
}

type LogConfig struct {
	Level string `mapstructure:"level"`
	File  string `mapstructure:"file"`
}

var AppConfig *Config

func InitConfig() error {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath(".")
	viper.AddConfigPath("./config")

	if err := viper.ReadInConfig(); err != nil {
		return fmt.Errorf("failed to read config: %w", err)
	}

	AppConfig = &Config{}
	if err := viper.Unmarshal(AppConfig); err != nil {
		return fmt.Errorf("failed to unmarshal config: %w", err)
	}

	log.Println("Configuration loaded successfully")
	return nil
}

func (m *MongoDBConfig) GetURI() string {
	if m.Username != "" && m.Password != "" {
		return fmt.Sprintf("mongodb://%s:%s@%s:%d", m.Username, m.Password, m.Host, m.Port)
	}
	return fmt.Sprintf("mongodb://%s:%d", m.Host, m.Port)
}
